# backend/api/progression/mongo_models.py
import mongoengine as me
from datetime import datetime

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
        self.streak_count += 1
        self.last_active   = datetime.utcnow()
        self.save()