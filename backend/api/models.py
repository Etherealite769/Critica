from mongoengine import Document, StringField, EmailField, BooleanField, DateTimeField, IntField, DictField, ListField, EmbeddedDocument, EmbeddedDocumentField
from datetime import datetime

class SkillNodeProgress(EmbeddedDocument):
    """Track progress for each skill node"""
    skill_node_id = IntField(required=True)
    completed_exercises = IntField(default=0)
    total_exercises = IntField(required=True)
    is_unlocked = BooleanField(default=False)
    is_completed = BooleanField(default=False)

class User(Document):
    """User model for MongoDB"""
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    is_active = BooleanField(default=True)
    is_staff = BooleanField(default=False)
    
    # Progression tracking
    streak = IntField(default=0)
    total_xp = IntField(default=0)
    skill_node_progress = ListField(EmbeddedDocumentField(SkillNodeProgress), default=list)
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'users',
        'indexes': ['email']
    }
    
    def __str__(self):
        return self.email
