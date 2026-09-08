# backend/api/modules/snap_gap/services.py
from .mongo_models import CoherenceNodeDocument


def _node_difficulty(node_id: str) -> int:
    try:
        num = int(node_id.split('_')[-1])
    except (ValueError, IndexError):
        return 1
    if num <= 2:  return 1
    if num <= 5:  return 2
    if num <= 8:  return 3
    if num <= 11: return 4
    return 5


class ContentManagementService:

    @staticmethod
    def get_node_document(node_id: str):
        return CoherenceNodeDocument.objects(
            node_id=node_id).first()

    @staticmethod
    def check_deep_dive_required(
            word_count: int) -> bool:
        return word_count > 300

    @staticmethod
    def serialize_node_payload(
            node: CoherenceNodeDocument) -> dict:
        return {
            'node_id':   node.node_id,
            'title':     node.title,
            'focus':     node.focus,
            'difficulty': _node_difficulty(node.node_id),
            'micro_lesson_text':
                         node.micro_lesson_text,
            'reading_passage':
                         node.reading_passage,
            'deep_dive_required':
                ContentManagementService
                .check_deep_dive_required(
                    node.word_count),
            'sentence_pairs': [
                {
                    'pair_id':    p.pair_id,
                    'sentence_a': p.sentence_a,
                    'sentence_b': p.sentence_b,
                }
                for p in node.sentence_pairs
            ],
            'transition_tile_dock':
                node.transition_tile_dock,
        }