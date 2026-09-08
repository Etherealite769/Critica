# backend/api/lexical/mongo_models.py
import mongoengine as me
from datetime import datetime

class LexicalReviewDocument(me.Document):
    student_id       = me.StringField(required=True)
    word             = me.StringField(required=True)
    definition       = me.StringField(default='')
    contextual_usage = me.StringField(default='')
    translation      = me.StringField(default='')
    context_task_id  = me.StringField(default='')
    interval_days    = me.IntField(default=1)
    next_review_date = me.DateTimeField()
    access_count     = me.IntField(default=1)
    first_accessed   = me.DateTimeField(
                           default=datetime.utcnow)
    last_reviewed    = me.DateTimeField()

    meta = {'collection': 'lexical_review_deck'}