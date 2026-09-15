# backend/api/progression/mongo_models.py
import mongoengine as me
from datetime import datetime, timezone, timedelta

class StudentProfileDocument(me.Document):
    student_id      = me.StringField(
                          required=True, unique=True)
    username        = me.StringField(required=True)

    # All four first nodes are unlocked by default
    unlocked_nodes  = me.ListField(
                          me.StringField(),
                          default=[
                              'log_node_01',
                              'snp_node_01',
                              'tap_node_01',
                              'fac_node_01',
                          ])
    completed_nodes = me.ListField(
                          me.StringField(),
                          default=list)
    streak_count    = me.IntField(default=0)
    total_xp        = me.IntField(default=0)
    current_level   = me.IntField(default=1)
    onboarding_completed = me.BooleanField(default=False)
    last_active     = me.DateTimeField(
                          default=datetime.utcnow)

    meta = {'collection': 'student_profiles'}

    def complete_onboarding(self):
        self.onboarding_completed = True
        self.save()

    def unlock_node(self, node_id: str):
        if node_id not in self.unlocked_nodes:
            self.unlocked_nodes.append(node_id)
            self.save()

    def complete_node(self, node_id: str):
        if node_id not in self.completed_nodes:
            self.completed_nodes.append(node_id)
            self.save()

    def add_xp(self, amount: int):
        from .services import ProgressionManagementService
        old_level = getattr(self, 'current_level', 1) or 1
        self.total_xp = (getattr(self, 'total_xp', 0) or 0) + max(0, amount)
        rank_info = ProgressionManagementService.calculate_rank_and_level(self.total_xp)
        self.current_level = rank_info['level']
        self.save()

        # Keep User model in sync if exists
        try:
            from api.models import User
            user = User.objects(id=self.student_id).first()
            if not user:
                user = User.objects(email=self.username).first()
            if user:
                user.total_xp = self.total_xp
                user.streak = self.streak_count
                user.save()
        except Exception:
            pass

        return {
            'xp_awarded': amount,
            'total_xp': self.total_xp,
            'level': self.current_level,
            'level_title': rank_info['rank_title'],
            'level_up': self.current_level > old_level,
            'progress_pct': rank_info['level_progress_pct'],
        }

    def increment_streak(self):
        now      = datetime.now(timezone.utc)
        today    = now.date()
        last     = self.last_active

        # Make last_active timezone-aware if stored naive
        if last and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)

        day_incremented = False
        if last and self.streak_count > 0:
            last_date = last.date()
            if last_date == today:
                # Already counted today — update timestamp but don't increment
                self.last_active = now
                self.save()
                return {
                    'streak': self.streak_count,
                    'new_day': False,
                    'xp_awarded': 0,
                    'total_xp': getattr(self, 'total_xp', 0),
                    'level': getattr(self, 'current_level', 1),
                }
            elif last_date == today - timedelta(days=1):
                # Consecutive day — extend streak
                self.streak_count += 1
                day_incremented = True
            else:
                # Missed a day — reset streak to 1
                self.streak_count = 1
                day_incremented = True
        else:
            self.streak_count = 1
            day_incremented = True

        self.last_active = now
        streak_xp = 0
        if day_incremented:
            # +25 XP base + (+5 XP * streak), capped at +50 XP max
            streak_xp = min(50, 25 + self.streak_count * 5)
            self.add_xp(streak_xp)
        else:
            self.save()

        return {
            'streak': self.streak_count,
            'new_day': day_incremented,
            'xp_awarded': streak_xp,
            'total_xp': getattr(self, 'total_xp', 0),
            'level': getattr(self, 'current_level', 1),
        }