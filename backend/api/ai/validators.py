# backend/api/ai/validators.py
import hashlib
import re
from typing import List, Dict, Any, Tuple, Set, Optional


def normalize_text(text: str) -> str:
    """Lowercase and strip punctuation/extra spaces for consistent comparison."""
    if not text:
        return ""
    cleaned = re.sub(r'[^\w\s]', '', text.lower())
    return " ".join(cleaned.split())


def calculate_question_hash(module: str, exercise: Dict[str, Any]) -> str:
    """
    Computes a deterministic SHA256 fingerprint from the reading passage and core target items.
    """
    passage = exercise.get('reading_passage', '')
    norm_passage = normalize_text(passage)

    if module == 'logic_thread':
        blocks = exercise.get('paragraph_blocks', [])
        content = norm_passage + "_" + "".join(normalize_text(b.get('text', '')) for b in blocks)
    elif module == 'snap_gap':
        pairs = exercise.get('sentence_pairs', [])
        content = norm_passage + "_" + "".join(
            normalize_text(p.get('sentence_a', '')) + normalize_text(p.get('sentence_b', ''))
            for p in pairs
        )
    elif module == 'tap_clues':
        words = exercise.get('locked_words', [])
        content = norm_passage + "_" + "".join(w.get('word', '').lower() for w in words)
    elif module == 'fact_scanner':
        sentences = exercise.get('article_sentences', [])
        content = norm_passage + "_" + "".join(normalize_text(s.get('text', '')) for s in sentences)
    else:
        content = norm_passage

    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def compute_jaccard_similarity(text1: str, text2: str) -> float:
    """Computes word-level Jaccard similarity between two texts."""
    words1 = set(normalize_text(text1).split())
    words2 = set(normalize_text(text2).split())
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)


def check_novelty_against_history(
    module: str,
    exercise: Dict[str, Any],
    past_hashes: Set[str],
    past_passages: List[str],
    max_jaccard: float = 0.35,
) -> Tuple[bool, str]:
    """
    Verifies that a generated exercise is novel and not a duplicate or rephrasing
    of any past exercise attempted by the student.
    """
    q_hash = calculate_question_hash(module, exercise)
    if q_hash in past_hashes:
        return False, f"Duplicate question hash {q_hash[:8]} matches past student attempt."

    curr_passage = exercise.get('reading_passage', '')
    for past_p in past_passages:
        if not past_p:
            continue
        sim = compute_jaccard_similarity(curr_passage, past_p)
        if sim > max_jaccard:
            return False, f"Semantic similarity ({sim:.2f}) with past question exceeds threshold ({max_jaccard})."

    return True, ""


def check_intra_session_diversity(
    exercises: List[Dict[str, Any]],
    max_jaccard: float = 0.40,
) -> Tuple[bool, str]:
    """
    Ensures that exercises within a single 5-question session explore diverse themes and text.
    """
    passages = [ex.get('reading_passage', '') for ex in exercises if ex.get('reading_passage')]
    for i in range(len(passages)):
        for j in range(i + 1, len(passages)):
            sim = compute_jaccard_similarity(passages[i], passages[j])
            if sim > max_jaccard:
                return False, f"Exercises {i+1} and {j+1} are too similar (Jaccard {sim:.2f} > {max_jaccard})."
    return True, ""


def validate_logic_thread_exercise(ex: Dict[str, Any]) -> Tuple[bool, str]:
    blocks = ex.get('paragraph_blocks', [])
    seq = ex.get('correct_sequence', [])

    if len(blocks) < 2:
        return False, "Exercise must have at least 2 paragraph blocks."

    block_ids = {b.get('block_id') for b in blocks if b.get('block_id')}
    if len(block_ids) != len(blocks):
        return False, "Duplicate or missing block_ids in paragraph_blocks."

    for b in blocks:
        if not b.get('text', '').strip():
            return False, f"Block {b.get('block_id')} contains empty text."

    if set(seq) != block_ids or len(seq) != len(blocks):
        return False, f"correct_sequence {seq} does not match block IDs {list(block_ids)}."

    hints = ex.get('scaffold_hints', [])
    if len(hints) < 3:
        return False, "Must provide 3 scaffold hints (tiers 1, 2, and 3)."

    return True, ""


def validate_snap_gap_exercise(ex: Dict[str, Any]) -> Tuple[bool, str]:
    pairs = ex.get('sentence_pairs', [])
    dock = ex.get('transition_tile_dock', [])
    tile_map = ex.get('correct_tile_map', {})

    if not pairs:
        return False, "Exercise must contain at least 1 sentence pair."

    if len(dock) < len(pairs):
        return False, "Transition tile dock must contain at least as many tiles as sentence pairs."

    if len(set(dock)) != len(dock):
        return False, "Transition tile dock contains duplicate tiles."

    for p in pairs:
        pid = p.get('pair_id')
        if not pid or pid not in tile_map:
            return False, f"Missing correct tile mapping for pair_id '{pid}'."
        correct_tile = tile_map[pid]
        if correct_tile not in dock:
            return False, f"Correct tile '{correct_tile}' for pair '{pid}' is not present in transition_tile_dock."

    return True, ""


def validate_tap_clues_exercise(ex: Dict[str, Any]) -> Tuple[bool, str]:
    passage = ex.get('reading_passage', '')
    norm_passage = normalize_text(passage)
    words = ex.get('locked_words', [])

    if not words:
        return False, "Exercise must have at least 1 locked vocabulary word."

    for w in words:
        target_word = normalize_text(w.get('word', ''))
        if not target_word:
            return False, "Locked word is empty."

        # Word boundary verification in normalized text
        if not re.search(r'\b' + re.escape(target_word) + r'\b', norm_passage):
            return False, f"Locked word '{w.get('word')}' not found as standalone token in reading passage."

        clue_ids = w.get('correct_clue_ids', [])
        if not clue_ids:
            return False, f"No clue words defined for locked word '{w.get('word')}'."

        for clue in clue_ids:
            norm_clue = normalize_text(clue)
            if not norm_clue:
                continue
            if norm_clue == target_word:
                return False, f"Clue '{clue}' cannot be identical to target word '{w.get('word')}'."
            if not re.search(r'\b' + re.escape(norm_clue) + r'\b', norm_passage):
                return False, f"Clue word '{clue}' for '{w.get('word')}' is not present as standalone token in passage."

    return True, ""


def validate_fact_scanner_exercise(ex: Dict[str, Any]) -> Tuple[bool, str]:
    sentences = ex.get('article_sentences', [])
    if len(sentences) < 3:
        return False, "Fact scanner exercise must have at least 3 article sentences."

    flawed_count = sum(1 for s in sentences if s.get('is_flawed', False))
    valid_count = len(sentences) - flawed_count

    if flawed_count < 1:
        return False, "Exercise must have at least 1 flawed sentence."
    if valid_count < 1:
        return False, "Exercise must have at least 1 reliable (non-flawed) sentence."

    for s in sentences:
        if s.get('is_flawed'):
            reason = s.get('flaw_reason', '').strip()
            if len(reason) < 5:
                return False, f"Flawed sentence '{s.get('sentence_id')}' must include a substantive flaw_reason."

    return True, ""


def validate_module_exercise(module: str, ex: Dict[str, Any]) -> Tuple[bool, str]:
    if module == 'logic_thread':
        return validate_logic_thread_exercise(ex)
    elif module == 'snap_gap':
        return validate_snap_gap_exercise(ex)
    elif module == 'tap_clues':
        return validate_tap_clues_exercise(ex)
    elif module == 'fact_scanner':
        return validate_fact_scanner_exercise(ex)
    return True, ""
