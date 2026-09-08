# backend/api/progression/services.py
from .mongo_models import StudentProfileDocument

NODE_UNLOCK_MAP = {
    # ── Logic Thread ──────────────────────────
    'log_node_01': 'log_node_02',
    'log_node_02': 'log_node_03',
    'log_node_03': 'log_node_04',
    'log_node_04': 'log_node_05',
    'log_node_05': 'log_node_06',
    'log_node_06': 'log_node_07',
    'log_node_07': 'log_node_08',
    'log_node_08': 'log_node_09',
    'log_node_09': 'log_node_10',
    'log_node_10': 'log_node_11',
    'log_node_11': 'log_node_12',
    'log_node_12': None,

    # ── Snap-in Gap ───────────────────────────
    'snp_node_01': 'snp_node_02',
    'snp_node_02': 'snp_node_03',
    'snp_node_03': 'snp_node_04',
    'snp_node_04': 'snp_node_05',
    'snp_node_05': 'snp_node_06',
    'snp_node_06': 'snp_node_07',
    'snp_node_07': 'snp_node_08',
    'snp_node_08': 'snp_node_09',
    'snp_node_09': 'snp_node_10',
    'snp_node_10': 'snp_node_11',
    'snp_node_11': 'snp_node_12',
    'snp_node_12': None,

    # ── Tap the Clues ─────────────────────────
    'tap_node_01': 'tap_node_02',
    'tap_node_02': 'tap_node_03',
    'tap_node_03': 'tap_node_04',
    'tap_node_04': 'tap_node_05',
    'tap_node_05': 'tap_node_06',
    'tap_node_06': 'tap_node_07',
    'tap_node_07': 'tap_node_08',
    'tap_node_08': 'tap_node_09',
    'tap_node_09': 'tap_node_10',
    'tap_node_10': 'tap_node_11',
    'tap_node_11': 'tap_node_12',
    'tap_node_12': None,

    # ── Fact Scanner ──────────────────────────
    'fac_node_01': 'fac_node_02',
    'fac_node_02': 'fac_node_03',
    'fac_node_03': 'fac_node_04',
    'fac_node_04': 'fac_node_05',
    'fac_node_05': 'fac_node_06',
    'fac_node_06': 'fac_node_07',
    'fac_node_07': 'fac_node_08',
    'fac_node_08': 'fac_node_09',
    'fac_node_09': 'fac_node_10',
    'fac_node_10': 'fac_node_11',
    'fac_node_11': 'fac_node_12',
    'fac_node_12': 'fac_node_13',
    'fac_node_13': 'fac_node_14',
    'fac_node_14': 'fac_node_15',
    'fac_node_15': None,
}

MODULE_NODES = {
    'logic_thread': [
        'log_node_01', 'log_node_02', 'log_node_03',
        'log_node_04', 'log_node_05', 'log_node_06',
        'log_node_07', 'log_node_08', 'log_node_09',
        'log_node_10', 'log_node_11', 'log_node_12',
        'log_node_13',
    ],
    'snap_gap': [
        'snp_node_01', 'snp_node_02', 'snp_node_03',
        'snp_node_04', 'snp_node_05', 'snp_node_06',
        'snp_node_07', 'snp_node_08', 'snp_node_09',
        'snp_node_10', 'snp_node_11', 'snp_node_12',
        'snp_node_13',
    ],
    'tap_clues': [
        'tap_node_01', 'tap_node_02', 'tap_node_03',
        'tap_node_04', 'tap_node_05', 'tap_node_06',
        'tap_node_07', 'tap_node_08', 'tap_node_09',
        'tap_node_10', 'tap_node_11', 'tap_node_12',
        'tap_node_13',
    ],
    'fact_scanner': [
        'fac_node_01', 'fac_node_02', 'fac_node_03',
        'fac_node_04', 'fac_node_05', 'fac_node_06',
        'fac_node_07', 'fac_node_08', 'fac_node_09',
        'fac_node_10', 'fac_node_11', 'fac_node_12',
        'fac_node_13', 'fac_node_14', 'fac_node_15',
        'fac_node_16',
    ],
}

MODULE_ENTRY_NODES = {
    'logic_thread': 'log_node_01',
    'snap_gap':     'snp_node_01',
    'tap_clues':    'tap_node_01',
    'fact_scanner': 'fac_node_01',
}

ALWAYS_UNLOCKED = [
    'log_node_01',
    'snp_node_01',
    'tap_node_01',
    'fac_node_01',
]


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

        changed = False
        for node_id in ALWAYS_UNLOCKED:
            if node_id not in \
                    profile.unlocked_nodes:
                profile.unlocked_nodes.append(
                    node_id)
                changed = True
        if changed:
            profile.save()

        return profile

    @staticmethod
    def is_node_unlocked(student_id, node_id):
        if node_id in ALWAYS_UNLOCKED:
            return True
        profile = StudentProfileDocument.objects(
            student_id=student_id).first()
        if not profile:
            return False
        if node_id in profile.unlocked_nodes:
            return True
            
        prefix = node_id.split('_')[0]
        unlocked_in_module = [
            nid for nid in profile.unlocked_nodes
            if nid.startswith(prefix)
        ]
        if not unlocked_in_module:
            return False
            
        def get_diff(nid):
            try:
                n = int(nid.split('_')[-1])
                return 1 if n % 3 == 1 else (2 if n % 3 == 2 else 3)
            except Exception:
                return 1
                
        max_unlocked_diff = max(get_diff(nid) for nid in unlocked_in_module)
        requested_diff = get_diff(node_id)
        
        return requested_diff <= max_unlocked_diff

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

    @staticmethod
    def reset_node(student_id, node_id):
        profile = ProgressionManagementService\
            .get_or_create_profile(student_id)
        if node_id in profile.completed_nodes:
            profile.completed_nodes.remove(node_id)
            profile.save()
        return profile