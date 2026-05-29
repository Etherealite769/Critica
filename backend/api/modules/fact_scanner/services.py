# backend/api/modules/fact_scanner/services.py
from .mongo_models import ArticleDocument

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