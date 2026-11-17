# backend/api/ai/fallback_pool.py
"""
Offline exercise bank, used when Gemini is unavailable or returns too few valid exercises.

Every case is Grade 11 Senior High School level (Philippine DepEd SHS Reading and Writing / EAPP), written to the
same tier calibration as the Gemini prompts (prompt_builder.MODULE_TIER_RULES) and the node seed exercises
(scripts/upgraded_exercises.json, which this bank includes). The cases live in fallback_exercises.json in the exact
schema Gemini sessions use; each carries `difficulty` (1 Basics, 2 Intermediate, 3 Advanced) and `family`, the node
focus it practises (logic genre, snap transition type, tap clue type, or fact CRAAP criterion).

Selection never leaves the node's tier while the tier has enough cases: unseen cases first, the node's own family
first within each group, and "seen" is judged by the same question hash session history records.
"""
import copy
import json
import os
import random
from typing import Any, Dict, List, Optional, Set

from .validators import calculate_question_hash

_DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fallback_exercises.json')

with open(_DATA_FILE, encoding='utf-8') as _f:
    FALLBACK_BANK: Dict[str, List[Dict[str, Any]]] = json.load(_f)['modules']

# Node number -> focus family. Each module repeats its four topics in blocks of three nodes
# (Basics, Intermediate, Advanced); node 13 revisits topic 1. Fact Scanner uses the node's CRAAP criterion.
_FAMILIES = {
    'logic_thread': ['narration', 'definition', 'comparison', 'cause'],
    'snap_gap': ['addition', 'contrast', 'cause', 'conclusion'],
    'tap_clues': ['synonym', 'definition', 'antonym', 'example'],
}


def node_family(module: str, node_id: str = '', craap_criterion: Optional[str] = None) -> Optional[str]:
    """The focus family a node practises, used to prefer matching fallback cases."""
    if module == 'fact_scanner':
        return (craap_criterion or '').upper() or None
    families = _FAMILIES.get(module)
    try:
        n = int((node_id or '').rsplit('_', 1)[-1])
    except ValueError:
        return None
    return families[((n - 1) // 3) % 4] if families and n > 0 else None


def _prepare(module: str, case: Dict[str, Any]) -> Dict[str, Any]:
    """Fresh copy of a bank case, shuffled where the game expects a shuffle."""
    ex = copy.deepcopy(case)
    if module == 'logic_thread':
        blocks = ex['paragraph_blocks']
        # Shuffle the cards, but never hand them out already in the answer order
        for _ in range(10):
            random.shuffle(blocks)
            if [b['block_id'] for b in blocks] != ex['correct_sequence']:
                break
    elif module == 'snap_gap':
        random.shuffle(ex['transition_tile_dock'])
    # Fact Scanner statements keep their order: the articles read as connected prose and the flawed
    # statement's position is already varied across the bank. Tap Clues passages are fixed text.
    return ex


def get_procedural_fallback_exercises(
    module: str,
    difficulty: int,
    exclude_hashes: Optional[Set[str]] = None,
    count: int = 5,
    family: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Up to `count` distinct cases for the module and tier, ordered: unseen + matching family, unseen, seen + matching
    family, seen. Other tiers are used only if this tier has fewer than `count` cases in total.
    """
    bank = FALLBACK_BANK.get(module, [])
    if not bank:
        return []
    exclude_hashes = set(exclude_hashes or ())
    tier = [c for c in bank if c.get('difficulty') == difficulty] or list(bank)
    others = [c for c in bank if c not in tier]

    def ordered(cases):
        prepared = [_prepare(module, c) for c in cases]
        random.shuffle(prepared)
        # Stable sort: unseen before seen, then the node's own family first
        return sorted(prepared, key=lambda ex: (calculate_question_hash(module, ex) in exclude_hashes,
                                                ex.get('family') != family))

    picks = ordered(tier)
    if len(picks) < count:
        picks += ordered(others)
    return picks[:count]


def get_fallback_batch(
    module: str,
    difficulty: int,
    count: int = 5,
    exclude_hashes: Optional[Set[str]] = None,
    family: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Primary fallback batch accessor used by session service."""
    return get_procedural_fallback_exercises(module, difficulty, exclude_hashes=exclude_hashes, count=count,
                                             family=family)
