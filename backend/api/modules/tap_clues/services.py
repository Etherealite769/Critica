# backend/api/modules/tap_clues/services.py
from .mongo_models import VocabularyNodeDocument

class ContentManagementService:

    @staticmethod
    def get_node_document(node_id: str):
        return VocabularyNodeDocument.objects(
            node_id=node_id).first()

    @staticmethod
    def check_deep_dive_required(
            word_count: int) -> bool:
        return word_count > 300

    @staticmethod
    def serialize_node_payload(
            node: VocabularyNodeDocument) -> dict:
        return {
            'node_id':   node.node_id,
            'title':     node.title,
            'focus':     node.focus,
            'micro_lesson_text':
                         node.micro_lesson_text,
            'reading_passage':
                         node.reading_passage,
            'deep_dive_required':
                ContentManagementService
                .check_deep_dive_required(
                    node.word_count),
            # Only send word_id, word, position
            # Never send correct_clue_ids or
            # definition to the frontend
            'locked_words': [
                {
                    'word_id':        w.word_id,
                    'word':           w.word,
                    'position_index': w.position_index,
                }
                for w in node.locked_words
            ],
        }