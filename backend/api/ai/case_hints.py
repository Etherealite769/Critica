# backend/api/ai/case_hints.py
"""
Socratic hints built from the active case, for all four modules, on a gradient that gets EASIER to act on:

  Level 0  (free, sidebar lightbulb)  A quick nudge on how to read this case. One or two short sentences.
  Level 1  (Dig deeper #1)            A specific clue: the phrase, signal or statement that unlocks the case.
  Level 2  (Dig deeper #2)            Distractor elimination: rules out one or two wrong options and says why,
                                      leaving the real contenders.
  Level 3  (Dig deeper #3)            A plain walkthrough of the correct link, so the cadet can choose and learn.

Every level reads the case payload itself (cards, exhibits and dock, locked word and clues, witness statements),
plus the per-case explanations the content already carries. Texts stay short enough to fit Crit's popover.
"""
import re
from typing import Any, Dict, List, Optional

MAX_LEVEL = 3
MAX_WORDS = 60   # keeps every hint inside the popover without scrolling


# ── shared helpers ─────────────────────────────────────────────────────────────

def _snip(text: str, words: int = 5) -> str:
    parts = (text or '').strip().split()
    out = ' '.join(parts[:words]).rstrip(',;:.')
    return out + ('...' if len(parts) > words else '')


def _lower_first(text: str) -> str:
    text = (text or '').strip().rstrip('.')
    return text[:1].lower() + text[1:] if text else text


def _sentence(text: str) -> str:
    """An explanation as its own sentence, original capitalization kept (proper nouns, "B", etc.)."""
    text = (text or '').strip().rstrip('.')
    return (text[:1].upper() + text[1:] + '.') if text else ''


def _fit(sentences: List[str], max_words: int = MAX_WORDS) -> str:
    """Join whole sentences while they fit the word budget (never cuts a sentence in half)."""
    out, count = [], 0
    for s in sentences:
        s = (s or '').strip()
        if not s:
            continue
        n = len(s.split())
        if out and count + n > max_words:
            break
        out.append(s)
        count += n
    return ' '.join(out)


def _quote_list(items: List[str]) -> str:
    quoted = [f'"{i}"' for i in items]
    return quoted[0] if len(quoted) == 1 else ', '.join(quoted[:-1]) + ' and ' + quoted[-1]


# ── Logic Thread ───────────────────────────────────────────────────────────────

_BACK_POINTER = re.compile(
    r"\b(this|these|that|those|such|the latter|the former|there|further|another|then|next|finally|meanwhile|"
    r"subsequently|consequently|as a result|however|by comparison|in contrast|therefore|thus|ultimately|later|"
    r"afterward|following|within)\b", re.I)
_DETERMINERS = {'this', 'these', 'that', 'those', 'such', 'another', 'the latter', 'the former'}


def _back_pointer_opening(text: str) -> Optional[str]:
    """The card's opening words up to a back-pointing word (plus its noun), if one is in the first six words."""
    head = ' '.join((text or '').split()[:6])
    m = _BACK_POINTER.search(head)
    if not m:
        return None
    end = m.end()
    if m.group(0).lower() in _DETERMINERS:
        nxt = re.match(r'\s+(?:(?:a|an|the)\s+)?[\w-]+', head[end:])
        if nxt:
            end += nxt.end()
    return head[:end].strip(' ,;:')


def _logic(ex: Dict[str, Any], level: int, state: Dict[str, Any]) -> str:
    blocks = ex.get('paragraph_blocks') or []
    text_of = {b.get('block_id'): b.get('text', '') for b in blocks}
    seq = [b for b in (ex.get('correct_sequence') or []) if b in text_of]
    card = lambda bid: f'"{_snip(text_of.get(bid, ""), 4)}"'   # noqa: E731

    if level == 0:
        return ('Look at how each card opens. Find the one that introduces the topic before any results, '
                'follow-up steps or words like "this" point back to it.')

    if level == 1:
        # The clearest link in the chain: a card whose opening points back to the card before it
        for prev, cur in zip(seq, seq[1:]):
            opening = _back_pointer_opening(text_of[cur])
            if opening:
                return _fit([f'Look at the card that opens "{opening}".',
                             'Those words point back to an idea from another card. Which card states that idea first?'])
        if seq:
            return _fit([f'The card beginning {card(seq[-1])} reads like a final step or result.',
                         'Which cards have to come before it?'])
        return 'Ask of each card: what must the reader already know for this sentence to make sense?'

    if level == 2:
        # Rule out wrong links with the case's own reasons
        short = lambda bid: f'"{_snip(text_of.get(bid, ""), 3)}"'   # noqa: E731
        lines = []
        for key, why in (ex.get('structural_explanations') or {}).items():
            src, _, tgt = key.partition('__')
            if src in text_of and tgt in text_of:
                lines.append(f'Not {short(src)} right before {short(tgt)}. {_sentence(why)}')
            if len(lines) == 2:
                break
        if lines:
            return _fit(lines)
        return _fit(['A card that opens by pointing back ("this", "such", "as a result") cannot open the chain.',
                     'Rule those out as openers.'])

    # level 3: walk the chain in order
    if not seq:
        return 'Thread the cards so that each one picks up what the card before it set up.'
    order = ' then '.join(card(b) for b in seq)
    return _fit([f'Thread them in this order: {order}.',
                 'Each card picks up exactly what the card before it set up.'], max_words=MAX_WORDS + 10)


# ── Snap Gap ───────────────────────────────────────────────────────────────────

_TILE_FAMILY = {
    'moreover': 'addition', 'furthermore': 'addition', 'in addition': 'addition', 'additionally': 'addition',
    'besides': 'addition', 'also': 'addition', 'what is more': 'addition', 'indeed': 'addition',
    'similarly': 'comparison', 'likewise': 'comparison',
    'however': 'contrast', 'in contrast': 'contrast', 'conversely': 'contrast', 'on the other hand': 'contrast',
    'on the contrary': 'contrast', 'instead': 'contrast', 'whereas': 'contrast',
    'nevertheless': 'concession', 'nonetheless': 'concession', 'even so': 'concession', 'still': 'concession',
    'therefore': 'result', 'consequently': 'result', 'as a result': 'result', 'thus': 'result', 'hence': 'result',
    'accordingly': 'result', 'otherwise': 'condition',
    'for example': 'example', 'for instance': 'example',
    'subsequently': 'time', 'meanwhile': 'time', 'then': 'time', 'next': 'time', 'afterward': 'time',
    'previously': 'time', 'prior to this': 'time',
    'in short': 'summary', 'overall': 'summary', 'ultimately': 'summary', 'in conclusion': 'summary',
    'on balance': 'summary', 'in summary': 'summary', 'in other words': 'restatement',
}
# How Exhibit B relates to Exhibit A, per family (used in the nudge, the clue and the walkthrough)
_NUDGE = {'addition': 'add a supporting point', 'comparison': 'describe a parallel case', 'contrast': 'show a contrast',
          'concession': 'hold true despite a weakness', 'result': 'state a result', 'condition': 'warn what happens otherwise',
          'example': 'give an example', 'time': 'follow as the next step', 'summary': 'sum things up',
          'restatement': 'say the same thing in other words'}
_QUESTION = {
    'addition': 'Is B a second point of the same kind as A?',
    'comparison': 'Is B a different case that works the same way as A?',
    'contrast': 'Does B set something against A or replace it?',
    'concession': 'Does B stay true even though A raises a weakness?',
    'result': 'Is B something that follows from A?',
    'condition': 'Does B describe what happens if A is not done?',
    'example': 'Is B one specific instance of the general claim in A?',
    'time': 'Is B what happens next, after A?',
    'summary': 'Does B wrap up or weigh what A says?',
    'restatement': 'Does B say what A says, in other words?',
}
_ROLE = {
    'addition': 'adds another point of the same kind to', 'comparison': 'describes a case that works like',
    'contrast': 'sets itself against', 'concession': 'holds true despite the weakness in',
    'result': 'is a consequence of', 'condition': 'says what happens if you ignore',
    'example': 'is a specific example of', 'time': 'is the step that follows', 'summary': 'sums up',
    'restatement': 'restates',
}


_FAMILY_ORDER = ['addition', 'comparison', 'contrast', 'concession', 'result', 'condition', 'example', 'time',
                 'summary', 'restatement']


def _why_not(tile: str, why: str) -> str:
    """An error explanation as a clause, without repeating the tile's own name ("However signals..." -> "it signals...")."""
    why = (why or '').strip().rstrip('.')
    if why.lower().startswith(tile.lower() + ' '):
        why = 'It ' + why[len(tile) + 1:]
    return _sentence(why)


def _family(tile: str) -> Optional[str]:
    return _TILE_FAMILY.get((tile or '').strip().lower())


def _active_pair(ex: Dict[str, Any], state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    pairs = ex.get('sentence_pairs') or []
    wanted = (state or {}).get('pair_id')
    done = (state or {}).get('board_state') or {}
    for p in pairs:
        if p.get('pair_id') == wanted:
            return p
    for p in pairs:
        if p.get('pair_id') not in done:
            return p
    return pairs[0] if pairs else None


def _snap(ex: Dict[str, Any], level: int, state: Dict[str, Any]) -> str:
    dock = ex.get('transition_tile_dock') or []
    if level == 0:
        answers = {_family(t) for t in (ex.get('correct_tile_map') or {}).values()} - {None}
        others = [f for f in (_family(t) for t in dock) if f and f not in answers]
        picked = set(answers) | set(others[:max(0, 3 - len(answers))])
        options = [_NUDGE[f] for f in _FAMILY_ORDER if f in picked] or ['add a point', 'show a contrast', 'state a result']
        ask = ', '.join(options[:-1]) + (', or ' if len(options) > 1 else '') + options[-1]
        return f'Compare Exhibit A and Exhibit B: does B {ask}?'

    pair = _active_pair(ex, state)
    if not pair:
        return 'Read Exhibit B straight after Exhibit A and name the job it does.'
    pid = pair.get('pair_id')
    tile = (ex.get('correct_tile_map') or {}).get(pid, '')
    fam = _family(tile)
    errs = ex.get('tile_error_explanations') or {}
    wrong = [t for t in dock if t != tile]
    rival = next((t for t in wrong if _family(t) == fam), None) or next((t for t in wrong if f'{pid}__{t}' in errs), None)

    if level == 1:
        return _fit([f'Read Exhibit B again: "{_snip(pair.get("sentence_b", ""), 7)}".',
                     _QUESTION.get(fam, 'What job does B do for A?')])

    if level == 2:
        out = [t for t in wrong if t != rival][:2]
        lines = [f'Rule out "{t}". {_why_not(t, errs.get(f"{pid}__{t}", "It does not match how B relates to A"))}'
                 for t in out]
        if rival:
            lines.append(f'That leaves "{tile}" and "{rival}".')
        return _fit(lines, max_words=MAX_WORDS + 10)

    # level 3: the walkthrough
    lines = [f'Choose "{tile}": Exhibit B {_ROLE.get(fam, "fits")} Exhibit A.']
    if rival and f'{pid}__{rival}' in errs:
        lines.append(f'"{rival}" is the trap. {_why_not(rival, errs[f"{pid}__{rival}"])}')
    return _fit(lines)


# ── Tap Clues ──────────────────────────────────────────────────────────────────

def _sentences(passage: str) -> List[str]:
    return [s for s in re.split(r'(?<=[.!?])\s+', passage or '') if s]


def _around(text: str, word: str, before: int = 3, after: int = 1) -> str:
    """A few words either side of `word` in `text`."""
    tokens = text.split()
    for i, t in enumerate(tokens):
        if re.sub(r'[^\w\'-]', '', t).lower() == word.lower():
            window = tokens[max(0, i - before): i + after + 1]
            while len(window) > 1 and window[-1].lower().strip(',;:.') in ('the', 'a', 'an', 'and', 'or', 'of', 'to'):
                window.pop()   # never end the quote on a dangling article or conjunction
            return ' '.join(window).strip(' ,;:.')
    return _snip(text, 7)


def _tap(ex: Dict[str, Any], level: int, state: Dict[str, Any]) -> str:
    passage = ex.get('reading_passage') or ''
    words = ex.get('locked_words') or []
    w = words[0] if words else {}
    target = w.get('word', '')
    clues = list(w.get('correct_clue_ids') or w.get('context_clues') or [])

    if level == 0:
        return (f'Read the sentence before and after "{target}". Is the writer restating it, contrasting it, '
                f'or giving an example of it?')

    if level == 1:
        if not clues:
            return f'Look at the words around "{target}" that describe the same thing.'
        home = next((s for s in _sentences(passage) if re.search(r'\b' + re.escape(clues[0]) + r'\b', s, re.I)), passage)
        return _fit([f'Look closely at the phrase "{_around(home, clues[0])}".',
                     f'What does it tell you about "{target}"?'])

    if level == 2:
        traps = list((ex.get('clue_error_explanations') or {}).items())[:2]
        lines = [f'Not "{k.split("__", 1)[1]}". {_sentence(v)}' for k, v in traps]
        lines.append(f'Look for the words that tell you what "{target}" means.')
        return _fit(lines, max_words=MAX_WORDS + 10)

    # level 3: the walkthrough
    definition = _lower_first(w.get('definition', ''))
    lines = [f'Tap {_quote_list(clues)}.' if clues else f'Re-read the sentence with "{target}".']
    if definition:
        lines.append(f'Together they show that "{target}" means {definition}.')
    return _fit(lines)


# ── Fact Scanner ───────────────────────────────────────────────────────────────

_NUDGE_CRAAP = {
    'CURRENCY': 'is it up to date? Look closely at the dates.',
    'RELEVANCE': 'does it bear on what the article is really about?',
    'AUTHORITY': 'is the source qualified to make this exact claim?',
    'ACCURACY': 'is the claim correct and backed by real evidence?',
    'PURPOSE': 'is it there to inform, or to sell and persuade?',
}
_YEAR = re.compile(r'\b(1[89]\d{2}|20\d{2})\b')
_SOURCE = re.compile(r"\b(according to [^,.]+|an? [\w-]+ (?:post|blog|page|council|alliance|study|survey)|"
                     r"[\w-]+ professor|[\w-]+ cardiologist|anonymous [\w-]+)\b", re.I)
_FIGURE = re.compile(r'\b\d[\d,.]*\s*(?:percent|%)?', re.I)


def _feature(crit: str, text: str) -> Optional[str]:
    """The detail in a statement that the criterion turns on: a date, a source, a figure."""
    if crit == 'CURRENCY':
        m = _YEAR.search(text)
        return f'the {m.group(0)} source' if m else None
    if crit == 'AUTHORITY':
        m = _SOURCE.search(text)
        return f'"{m.group(0)}"' if m else None
    if crit == 'ACCURACY':
        m = _FIGURE.search(text)
        return f'the figure "{m.group(0).strip()}"' if m else None
    return None


def _fact(ex: Dict[str, Any], level: int, state: Dict[str, Any]) -> str:
    crit = (ex.get('craap_criterion') or 'CURRENCY').upper()
    sents = ex.get('article_sentences') or []
    flawed = [s for s in sents if s.get('is_flawed')]
    sound = [s for s in sents if not s.get('is_flawed')]
    expl = ex.get('sentence_explanations') or {}

    if level == 0:
        return f'Check every witness statement against {crit}: {_NUDGE_CRAAP.get(crit, _NUDGE_CRAAP["CURRENCY"])}'

    target = flawed[0] if flawed else None
    if level == 1:
        if not target:
            return f'Test each statement against {crit} one at a time.'
        feature = _feature(crit, target.get('text', ''))
        if feature:
            return _fit([f'Look closely at {feature}.', f'Does it pass the {crit} test?'])
        return _fit([f'Re-read the statement that begins "{_snip(target.get("text", ""), 6)}".',
                     f'Does it pass the {crit} test?'])

    if level == 2:
        cleared = sound[:2] if len(sound) > 2 else sound[:1]
        lines = [f'{s.get("sentence_id")} holds up. {_sentence(expl.get(s.get("sentence_id"), "It passes the test"))}'
                 for s in cleared]
        left = [s.get('sentence_id') for s in sents if s not in cleared]
        if len(left) >= 2:
            lines.append(f'That leaves {", ".join(left[:-1])} and {left[-1]}.')
        return _fit(lines, max_words=MAX_WORDS + 10)

    # level 3: the walkthrough
    if not target:
        return f'Apply {crit} to each statement.'
    return _fit([f'Quarantine {target.get("sentence_id")}: it fails the {crit} test.', _sentence(target.get('flaw_reason', ''))])


_BUILDERS = {'logic_thread': _logic, 'snap_gap': _snap, 'tap_clues': _tap, 'fact_scanner': _fact}


def case_hint(module: str, exercise: Dict[str, Any], level: int, state: Optional[Dict[str, Any]] = None) -> str:
    """Level 0: free nudge. Levels 1-3: specific clue, distractor elimination, walkthrough. `state` is the
    cadet's current board (Snap Gap uses it to hint on the gap they are working on)."""
    builder = _BUILDERS.get(module)
    if not builder:
        return 'Re-read the passage carefully and test each piece of evidence.'
    return builder(exercise or {}, max(0, min(MAX_LEVEL, int(level))), state if isinstance(state, dict) else {})
