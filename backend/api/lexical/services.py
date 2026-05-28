# backend/api/lexical/services.py
from datetime import datetime, timedelta
from .mongo_models import LexicalReviewDocument

class SpacedRepetitionService:
    EASE = 2.5

    @staticmethod
    def schedule_word(student_id,
                      word_data, task_id):
        existing = LexicalReviewDocument.objects(
            student_id=student_id,
            word=word_data.get('word', '')
        ).first()

        if existing:
            new_interval = max(1, int(
                existing.interval_days *
                SpacedRepetitionService.EASE))
            existing.interval_days    = new_interval
            existing.next_review_date = (
                datetime.utcnow() +
                timedelta(days=new_interval))
            existing.access_count    += 1
            existing.last_reviewed    = datetime.utcnow()
            existing.save()
        else:
            LexicalReviewDocument(
                student_id=student_id,
                word=word_data.get('word', ''),
                definition=word_data.get(
                    'definition', ''),
                contextual_usage=word_data.get(
                    'contextual_usage', ''),
                translation=word_data.get(
                    'translation', ''),
                context_task_id=task_id,
                interval_days=1,
                next_review_date=(
                    datetime.utcnow() +
                    timedelta(days=1)),
            ).save()