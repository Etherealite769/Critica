# backend/api/ai/mongo_models.py
import mongoengine as me
from datetime import datetime, timezone, timedelta

class StudentQuestionHistoryDocument(me.Document):
    """
    Maintains historical fingerprints of AI-generated questions encountered by each student.
    Used to prevent exact and semantic duplicate questions on future attempts.
    """
    student_id    = me.StringField(required=True)
    module        = me.StringField(required=True)
    node_id       = me.StringField(required=True)
    question_hash = me.StringField(required=True)
    topic_summary = me.StringField(default='')
    difficulty    = me.IntField(default=1)
    created_at    = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'student_question_history',
        'indexes': [
            ('student_id', 'node_id'),
            'question_hash',
            '-created_at',
        ]
    }


class GeneratedSessionDocument(me.Document):
    """
    Stores the full active session containing 5 AI-generated exercises for a specific node attempt.
    """
    session_id    = me.StringField(required=True, unique=True)
    student_id    = me.StringField(required=True)
    module        = me.StringField(required=True)
    node_id       = me.StringField(required=True)
    difficulty    = me.IntField(default=1)
    exercises     = me.ListField(me.DictField(), default=list)
    current_index = me.IntField(default=0)
    is_completed  = me.BooleanField(default=False)
    created_at    = me.DateTimeField(default=datetime.utcnow)
    expires_at    = me.DateTimeField()

    meta = {
        'collection': 'generated_question_sessions',
        'indexes': [
            'session_id',
            ('student_id', 'module', 'node_id'),
            '-created_at',
        ]
    }

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return now > exp
