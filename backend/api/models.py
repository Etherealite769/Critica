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
    profile_picture = StringField(default='')

    # Email verification. New sign-ups start as 'unverified'; documents created
    # before this field existed load with the default 'active' so existing
    # accounts keep working.
    account_status = StringField(default='active', choices=('unverified', 'active'))
    verification_code_hash = StringField()
    verification_link_hash = StringField()   # one-click email link (HMAC)
    verification_expires_at = DateTimeField()
    verification_attempts = IntField(default=0)
    verification_sent_at = DateTimeField()

    # Password reset (single-use token; only its HMAC is stored)
    password_reset_hash = StringField()
    password_reset_expires_at = DateTimeField()
    password_reset_sent_at = DateTimeField()

    # Progression tracking
    streak = IntField(default=0)
    total_xp = IntField(default=0)
    skill_node_progress = ListField(EmbeddedDocumentField(SkillNodeProgress), default=list)
    
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'users',
        'indexes': ['email', {'fields': ['verification_link_hash'], 'sparse': True}]
    }
    
    def __str__(self):
        return self.email
    
    @property
    def is_authenticated(self):
        """Always return True if the object exists."""
        return True
