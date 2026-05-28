# backend/api/progression/services.py
from .mongo_models import StudentProfileDocument

# Every node and what it unlocks next
NODE_UNLOCK_MAP = {
    'log_node_01': 'log_node_02',
    'log_node_02': 'log_node_03',
    'log_node_03': 'log_node_04',
    'log_node_04': 'snp_node_01',
    'snp_node_01': 'snp_node_02',
    'snp_node_02': 'snp_node_03',
    'snp_node_03': 'snp_node_04',
    'snp_node_04': 'tap_node_01',
    'tap_node_01': 'tap_node_02',
    'tap_node_02': 'tap_node_03',
    'tap_node_03': 'tap_node_04',
    'tap_node_04': 'fac_node_01',
    'fac_node_01': 'fac_node_02',
    'fac_node_02': 'fac_node_03',
    'fac_node_03': 'fac_node_04',
    'fac_node_04': 'fac_node_05',
    'fac_node_05': None,
}

# Nodes that belong to each module tab
MODULE_NODES = {
    'logic_thread': [
        'log_node_01', 'log_node_02',
        'log_node_03', 'log_node_04',
    ],
    'snap_gap': [
        'snp_node_01', 'snp_node_02',
        'snp_node_03', 'snp_node_04',
    ],
    'tap_clues': [
        'tap_node_01', 'tap_node_02',
        'tap_node_03', 'tap_node_04',
    ],
    'fact_scanner': [
        'fac_node_01', 'fac_node_02',
        'fac_node_03', 'fac_node_04',
        'fac_node_05',
    ],
}

# First node of each module
MODULE_ENTRY_NODES = {
    'logic_thread': 'log_node_01',
    'snap_gap':     'snp_node_01',
    'tap_clues':    'tap_node_01',
    'fact_scanner': 'fac_node_01',
}


class ProgressionManagementService:

    @staticmethod
    def get_or_create_profile(student_id,
                              username=''):
        profile = StudentProfileDocument.objects(
            student_id=student_id).first()
        if not profile:
            profile = StudentProfileDocument(
                student_id=student_id,
                username=username,
            )
            profile.save()
        return profile

    @staticmethod
    def is_node_unlocked(student_id, node_id):
        profile = StudentProfileDocument.objects(
            student_id=student_id).first()
        return bool(
            profile and
            node_id in profile.unlocked_nodes
        )

    @staticmethod
    def update_progression(student_id,
                           node_id,
                           username=''):
        profile = ProgressionManagementService\
            .get_or_create_profile(
                student_id, username)
        profile.complete_node(node_id)
        profile.increment_streak()
        next_node = NODE_UNLOCK_MAP.get(node_id)
        if next_node:
            profile.unlock_node(next_node)
        return {
            'completed_node': node_id,
            'next_node':      next_node,
            'streak':         profile.streak_count,
            'unlocked_nodes': profile.unlocked_nodes,
        }