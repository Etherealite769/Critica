# backend/api/scaffold/mongo_models.py
import mongoengine as me
from datetime import datetime

class TelemetryLogDocument(me.Document):
    student_id         = me.StringField(required=True)
    node_id            = me.StringField(required=True)
    module             = me.StringField(required=True)
    word_id            = me.StringField(default='')
    clue_word_id       = me.StringField(default='')
    is_correct         = me.BooleanField(default=False)
    hint_used          = me.BooleanField(default=False)
    hint_tier          = me.IntField(default=0)
    consecutive_errors = me.IntField(default=0)
    inactivity_trigger = me.BooleanField(default=False)
    timestamp          = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'telemetry_logs',
        'indexes': [
            'student_id',
            ('student_id', 'node_id'),
            '-timestamp',
        ]
    }
