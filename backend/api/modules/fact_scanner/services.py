# backend/api/modules/fact_scanner/services.py
from .mongo_models import ArticleDocument


def _node_difficulty(node_id: str) -> int:
    """Derive difficulty tier 1-5 from node_id suffix."""
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
        return ArticleDocument.objects(
            node_id=node_id).first()

    @staticmethod
    def check_deep_dive_required(
            word_count: int) -> bool:
        return word_count > 300

    @staticmethod
    def serialize_node_payload(
            node: ArticleDocument) -> dict:
        return {
            'node_id':        node.node_id,
            'title':          node.title,
            'focus':          node.focus,
            'craap_criterion':node.craap_criterion,
            'micro_lesson_text':
                              node.micro_lesson_text,
            'reading_passage':node.reading_passage,
            'difficulty':     _node_difficulty(node.node_id),
            'deep_dive_required':
                ContentManagementService
                .check_deep_dive_required(
                    node.word_count),
            # Never send is_flawed or flaw_reason
            'article_sentences': [
                {
                    'sentence_id': s.sentence_id,
                    'text':        s.text,
                }
                for s in node.article_sentences
            ],
        }