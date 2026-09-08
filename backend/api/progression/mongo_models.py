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
    last_active     = me.DateTimeField(
                          default=datetime.utcnow)

    meta = {'collection': 'student_profiles'}

    def unlock_node(self, node_id: str):
        if node_id not in self.unlocked_nodes:
            self.unlocked_nodes.append(node_id)
            self.save()

    def complete_node(self, node_id: str):
        if node_id not in self.completed_nodes:
            self.completed_nodes.append(node_id)
            self.save()

    def increment_streak(self):
        now      = datetime.now(timezone.utc)
        today    = now.date()
        last     = self.last_active

        # Make last_active timezone-aware if stored naive
        if last and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)

        if last:
            last_date = last.date()
            if last_date == today:
                # Already counted today — update
                # timestamp but don't increment
                self.last_active = now
                self.save()
                return
            elif last_date == today - timedelta(days=1):
                # Consecutive day — extend streak
                self.streak_count += 1
            else:
                # Missed a day — reset streak to 1
                self.streak_count = 1
        else:
            self.streak_count = 1

        self.last_active = now
        self.save()