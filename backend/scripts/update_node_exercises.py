"""
Replaces the stored exercise content of every node from scripts/upgraded_exercises.json.

Only exercise fields are written (a $set per node, listed in EXERCISE_FIELDS below). node_id, title, focus,
micro_lesson_text, craap_criterion, track and every other field are left alone; a payload that contains any
other field is rejected. Difficulty is not stored: it is derived from the node number (n % 3: 1 Basics,
2 Intermediate, 0 Advanced), exactly as api/progression and the frontend do.

Before writing, the current exercise fields of every node in all four collections are saved to
scripts/exercises_backup_<timestamp>.json (gitignored).

Usage (from backend/):
  python scripts/update_node_exercises.py --dry-run                 # validate + report; writes nothing
  python scripts/update_node_exercises.py --dry-run --show tap_node_09 snp_node_05
  python scripts/update_node_exercises.py                           # validate, back up, then update
  python scripts/update_node_exercises.py --only vocabulary_nodes   # write one collection only (still backs up all)

Nothing is written if any node fails validation.
"""
import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402

django.setup()   # connects mongoengine exactly as config/settings.py does (MONGO_URI from backend/.env)

from mongoengine.connection import get_db  # noqa: E402

from api.ai.validators import locate_word_index, passage_word_cores  # noqa: E402

SCRIPTS = os.path.join(BACKEND, 'scripts')
DATA_FILE = os.path.join(SCRIPTS, 'upgraded_exercises.json')
DEFAULT_SHOW = ['log_node_01', 'snp_node_05', 'tap_node_09', 'fac_node_12']   # Basics, Intermediate, Advanced, Advanced

COLLECTIONS = {
    'log': 'logic_thread_nodes',
    'snp': 'coherence_nodes',
    'tap': 'vocabulary_nodes',
    'fac': 'fact_scanner_articles',
}
EXERCISE_FIELDS = {
    'logic_thread_nodes': {'reading_passage', 'word_count', 'paragraph_blocks', 'correct_sequence',
                           'structural_explanations', 'scaffold_hints'},
    'coherence_nodes': {'sentence_pairs', 'transition_tile_dock', 'correct_tile_map',
                        'tile_error_explanations', 'scaffold_hints'},
    'vocabulary_nodes': {'reading_passage', 'word_count', 'locked_words', 'clue_error_explanations',
                         'scaffold_hints'},
    'fact_scanner_articles': {'reading_passage', 'word_count', 'article_sentences', 'sentence_explanations',
                              'scaffold_hints'},
}
TIERS = {1: 'Basics', 2: 'Intermediate', 0: 'Advanced'}
# Function words the Tap Clues screen makes untappable (frontend STOP_WORDS); a clue must not be one
STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as',
    'is', 'was', 'were', 'are', 'be', 'been', 'am', 'it', 'its', 'this', 'that', 'these', 'those',
    'he', 'she', 'they', 'we', 'you', 'i', 'his', 'her', 'their', 'our', 'your', 'my',
}
MAX_CARD_CHARS = 180   # api/ai/validators.py card-fit limit


def tier_of(node_id):
    return TIERS[int(node_id.rsplit('_', 1)[-1]) % 3]


def check_hints(h, errs):
    if not isinstance(h, list) or sorted(x.get('tier') for x in h) != [1, 2, 3]:
        errs.append('scaffold_hints must have exactly one hint for each tier 1, 2, 3')
    elif any(not (x.get('hint_text') or '').strip() for x in h):
        errs.append('a scaffold hint is empty')


def check_passage(p, joined, errs):
    if p.get('reading_passage') != joined:
        errs.append('reading_passage does not equal the items joined in order')
    if p.get('word_count') != len(joined.split()):
        errs.append(f"word_count {p.get('word_count')} != {len(joined.split())}")


def validate_logic(p, tier):
    errs = []
    blocks, seq = p.get('paragraph_blocks') or [], p.get('correct_sequence') or []
    ids = [b.get('block_id') for b in blocks]
    want = {'Basics': 3, 'Intermediate': 4, 'Advanced': 5}[tier]
    if len(blocks) != want:
        errs.append(f'{tier} expects {want} cards, found {len(blocks)}')
    if len(set(ids)) != len(ids) or sorted(seq) != sorted(ids):
        errs.append(f'correct_sequence {seq} is not a permutation of block ids {ids}')
    else:
        by_id = {b['block_id']: b for b in blocks}
        if [by_id[s].get('order') for s in seq] != list(range(1, len(seq) + 1)):
            errs.append('block "order" values disagree with correct_sequence')
        if ids == seq:
            errs.append('cards are listed already in the correct order (not scrambled)')
        check_passage(p, ' '.join(by_id[s]['text'] for s in seq), errs)
        correct_links = {f'{a}__{b}' for a, b in zip(seq, seq[1:])}
        for key in p.get('structural_explanations') or {}:
            a, _, b = key.partition('__')
            if a not in by_id or b not in by_id:
                errs.append(f'structural_explanations key {key} names an unknown block')
            elif key in correct_links:
                errs.append(f'structural_explanations explains {key}, which is a CORRECT link')
    for b in blocks:
        if len(b.get('text', '')) > MAX_CARD_CHARS:
            errs.append(f"card {b.get('block_id')} is {len(b['text'])} chars (> {MAX_CARD_CHARS})")
    if not p.get('structural_explanations'):
        errs.append('no structural_explanations')
    check_hints(p.get('scaffold_hints'), errs)
    return errs, len(blocks)


def validate_snap(p, tier):
    errs = []
    pairs, dock = p.get('sentence_pairs') or [], p.get('transition_tile_dock') or []
    tile_map, expl = p.get('correct_tile_map') or {}, p.get('tile_error_explanations') or {}
    want = 1 if tier == 'Basics' else 2
    if len(pairs) != want:
        errs.append(f'{tier} expects {want} sentence pair(s), found {len(pairs)}')
    if len(set(dock)) != len(dock):
        errs.append('transition_tile_dock has duplicate tiles')
    if not 3 <= len(dock) <= 6:
        errs.append(f'transition_tile_dock must hold 3-6 tiles, found {len(dock)}')
    answers = []
    for pair in pairs:
        pid = pair.get('pair_id')
        tile = tile_map.get(pid)
        if tile not in dock:
            errs.append(f'{pid}: correct tile {tile!r} is not in the dock')
            continue
        answers.append(tile)
        if not pair.get('sentence_a', '').rstrip().endswith('.'):
            errs.append(f'{pid}: sentence_a must be a full sentence ending with a period')
        sb = pair.get('sentence_b', '').strip().lower()
        for t in dock:
            if sb.startswith(t.lower() + ' ') or sb.startswith(t.lower() + ','):
                errs.append(f'{pid}: sentence_b spoils the tile {t!r}')
        for t in dock:
            if t != tile and f'{pid}__{t}' not in expl:
                errs.append(f'{pid}: no explanation for distractor {t!r}')
        if f'{pid}__{tile}' in expl:
            errs.append(f'{pid}: the correct tile {tile!r} has an error explanation')
    if len(set(answers)) != len(answers):
        errs.append('two pairs share the same correct tile')
    if set(tile_map) != {pr.get('pair_id') for pr in pairs}:
        errs.append('correct_tile_map keys do not match the pair ids')
    check_hints(p.get('scaffold_hints'), errs)
    return errs, len(pairs)


def validate_tap(p, tier):
    errs = []
    passage = p.get('reading_passage') or ''
    cores = [c.lower() for c in passage_word_cores(passage)]
    words = p.get('locked_words') or []
    if len(words) != 1:
        errs.append(f'expected 1 locked word, found {len(words)}')
    if p.get('word_count') != len(passage.split()):
        errs.append(f"word_count {p.get('word_count')} != {len(passage.split())}")
    need = {'Basics': 2, 'Intermediate': 3, 'Advanced': 4}[tier]   # exact Tap Clues clue count per tier
    for w in words:
        target = (w.get('word') or '').lower()
        hits = cores.count(target)
        if hits != 1:
            errs.append(f'target {target!r} must appear exactly once as a whole word (found {hits})')
        idx = locate_word_index(passage, target)
        if idx is None or w.get('position_index') != idx:
            errs.append(f"position_index {w.get('position_index')} != token index {idx} of {target!r}")
        if re.search(r'\b' + re.escape(target) + r',?\s+(or|meaning)\b', passage, re.I):
            errs.append(f'appositive handout ("{target}, or/meaning ...") is not allowed')
        clues = w.get('correct_clue_ids') or []
        if len(clues) != need:
            errs.append(f'{tier} expects exactly {need} clue words, found {len(clues)}')
        for c in clues:
            cl = c.lower()
            if ' ' in cl or cl not in cores:
                errs.append(f'clue {c!r} is not a single whole word in the passage')
            if cl in STOP_WORDS:
                errs.append(f'clue {c!r} is a function word the screen makes untappable')
            if cl in target or target in cl:
                errs.append(f'clue {c!r} overlaps the target {target!r}')
        for key in p.get('clue_error_explanations') or {}:
            wid, _, tapped = key.partition('__')
            if wid != w.get('word_id') or tapped not in cores:
                errs.append(f'clue_error_explanations key {key} does not name a passage word')
            elif tapped in [c.lower() for c in clues]:
                errs.append(f'clue_error_explanations covers {tapped!r}, which is a correct clue')
        for f in ('definition', 'contextual_usage', 'translation'):
            if not (w.get(f) or '').strip():
                errs.append(f'locked word is missing {f}')
    check_hints(p.get('scaffold_hints'), errs)
    return errs, len(words)


def validate_fact(p, tier):
    errs = []
    sents = p.get('article_sentences') or []
    ids = [s.get('sentence_id') for s in sents]
    if ids != ['s1', 's2', 's3', 's4']:
        errs.append(f'expected the four witness statements s1-s4, found {ids}')
    flawed = [s for s in sents if s.get('is_flawed')]
    allowed = (1, 2) if tier == 'Advanced' else (1,)
    if len(flawed) not in allowed:
        errs.append(f'{tier} expects {" or ".join(map(str, allowed))} flawed statement(s), found {len(flawed)}')
    for s in sents:
        reason = (s.get('flaw_reason') or '').strip()
        if s.get('is_flawed') and len(reason) < 20:
            errs.append(f"{s.get('sentence_id')}: flawed statement needs a substantive flaw_reason")
        if not s.get('is_flawed') and reason:
            errs.append(f"{s.get('sentence_id')}: sound statement has a flaw_reason")
    expl = p.get('sentence_explanations') or {}
    if set(expl) != set(ids):
        errs.append('sentence_explanations must cover every statement')
    check_passage(p, ' '.join(s.get('text', '') for s in sents), errs)
    check_hints(p.get('scaffold_hints'), errs)
    return errs, len(sents)


VALIDATORS = {'logic_thread_nodes': validate_logic, 'coherence_nodes': validate_snap,
              'vocabulary_nodes': validate_tap, 'fact_scanner_articles': validate_fact}
ITEM_NAME = {'logic_thread_nodes': 'cards', 'coherence_nodes': 'pairs', 'vocabulary_nodes': 'locked words',
             'fact_scanner_articles': 'statements'}


def show(node_id, collection, payload):
    print(f'\n=== {node_id} ({collection}, {tier_of(node_id)}) ===')
    if collection == 'logic_thread_nodes':
        print('Cards as shown (scrambled):')
        for b in payload['paragraph_blocks']:
            print(f"  [{b['block_id']}] {b['text']}")
        print('Answer:', ' -> '.join(payload['correct_sequence']))
        for k, v in payload['structural_explanations'].items():
            print(f'  wrong link {k}: {v}')
    elif collection == 'coherence_nodes':
        print('Dock:', ' | '.join(payload['transition_tile_dock']))
        for pr in payload['sentence_pairs']:
            pid = pr['pair_id']
            print(f"  {pid}: A: {pr['sentence_a']}\n          B: ____ {pr['sentence_b']}")
            print(f"          answer: {payload['correct_tile_map'][pid]}")
            for k, v in payload['tile_error_explanations'].items():
                if k.startswith(pid + '__'):
                    print(f"          x {k.split('__', 1)[1]}: {v}")
    elif collection == 'vocabulary_nodes':
        w = payload['locked_words'][0]
        print('Passage:', payload['reading_passage'])
        print(f"Locked: {w['word']!r} at token {w['position_index']}  clues: {w['correct_clue_ids']}")
        print(f"Definition: {w['definition']}  | Filipino: {w['translation']}")
        for k, v in payload['clue_error_explanations'].items():
            print(f'  x {k}: {v}')
    else:
        for s in payload['article_sentences']:
            mark = 'FLAWED' if s['is_flawed'] else 'sound '
            print(f"  {s['sentence_id']} [{mark}] {s['text']}")
            if s['is_flawed']:
                print(f"           reason: {s['flaw_reason']}")
    for h in payload['scaffold_hints']:
        print(f"  hint {h['tier']}: {h['hint_text']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help='validate and report; write nothing')
    parser.add_argument('--show', nargs='*', default=None, help='node_ids to print in full (default: 4 samples)')
    parser.add_argument('--only', choices=sorted(EXERCISE_FIELDS), default=None,
                        help='write only this collection (every node is still validated and backed up)')
    args = parser.parse_args()

    with open(DATA_FILE, encoding='utf-8') as f:
        upgraded = json.load(f)['nodes']

    db = get_db()
    live = {}
    for collection in COLLECTIONS.values():
        for row in db[collection].find({}, {'_id': 0, 'node_id': 1}):
            live[row['node_id']] = collection

    errors, report = {}, defaultdict(lambda: defaultdict(list))
    for node_id, payload in sorted(upgraded.items()):
        collection = COLLECTIONS.get(node_id.split('_', 1)[0])
        node_errs = []
        if collection is None:
            node_errs.append('unknown node prefix')
        else:
            extra = set(payload) - EXERCISE_FIELDS[collection]
            if extra:
                node_errs.append(f'payload contains non-exercise field(s) {sorted(extra)}; refusing to touch them')
            if live.get(node_id) != collection:
                node_errs.append(f'not found in {collection}')
            errs, items = VALIDATORS[collection](payload, tier_of(node_id))
            node_errs += errs
            report[collection][tier_of(node_id)].append((node_id, items))
        if node_errs:
            errors[node_id] = node_errs

    missing = sorted(set(live) - set(upgraded))

    print(f'{len(upgraded)} upgraded node(s) in {os.path.relpath(DATA_FILE, BACKEND)}; {len(live)} node(s) in MongoDB.\n')
    for collection in COLLECTIONS.values():
        print(collection)
        for tier in ('Basics', 'Intermediate', 'Advanced'):
            rows = report[collection].get(tier, [])
            counts = sorted({n for _, n in rows})
            print(f'  {tier:<13}{len(rows):>3} node(s)  {ITEM_NAME[collection]} per node: {counts or "-"}  '
                  f'{", ".join(nid for nid, _ in rows)}')
    if missing:
        print(f'\nIn MongoDB but not in the upgrade file (left unchanged): {", ".join(missing)}')

    if errors:
        print(f'\nVALIDATION FAILED for {len(errors)} node(s); nothing will be written:')
        for node_id, errs in errors.items():
            for e in errs:
                print(f'  {node_id}: {e}')
    else:
        print(f'\nValidation passed: {len(upgraded)} node(s), schema and answer keys consistent with the new text.')

    for node_id in (args.show if args.show is not None else DEFAULT_SHOW):
        if node_id in upgraded:
            show(node_id, COLLECTIONS[node_id.split('_', 1)[0]], upgraded[node_id])

    if args.dry_run or errors:
        print('\n[dry run] Nothing was written.' if args.dry_run else '\nAborted. Nothing was written.')
        sys.exit(1 if errors else 0)

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup_path = os.path.join(SCRIPTS, f'exercises_backup_{stamp}.json')
    backup = {}
    for collection, fields in EXERCISE_FIELDS.items():
        for row in db[collection].find({}, {'_id': 0, 'node_id': 1, **{f: 1 for f in fields}}):
            backup[row['node_id']] = {'collection': collection, **row}
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(backup, f, ensure_ascii=False, indent=2, default=str)
    print(f'\nBacked up the exercise fields of {len(backup)} node(s) to {backup_path}')

    updated = 0
    for node_id, payload in sorted(upgraded.items()):
        collection = COLLECTIONS[node_id.split('_', 1)[0]]
        if args.only and collection != args.only:
            continue
        updated += db[collection].update_one({'node_id': node_id}, {'$set': payload}).modified_count
    print(f'Updated exercise content on {updated} node(s){" in " + args.only if args.only else ""}.')


if __name__ == '__main__':
    main()
