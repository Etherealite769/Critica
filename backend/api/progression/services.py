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

    LEVEL_THRESHOLDS = [
        (1, "Novice Analyst", 0, 799),
        (2, "Field Investigator", 800, 1999),
        (3, "Senior Case Officer", 2000, 3999),
        (4, "Chief Inspector", 4000, 6999),
        (5, "Bureau Chief", 7000, 999999),
    ]

    @staticmethod
    def calculate_rank_and_level(xp: int):
        xp = max(0, int(xp or 0))
        for level, title, min_xp, max_xp in ProgressionManagementService.LEVEL_THRESHOLDS:
            if xp <= max_xp or max_xp == 999999:
                xp_in_level = xp - min_xp
                level_span = (max_xp - min_xp + 1) if max_xp != 999999 else 3000
                progress_pct = min(100, max(0, int((xp_in_level / level_span) * 100)))
                next_level_xp = max_xp + 1 if max_xp != 999999 else max_xp
                return {
                    'level': level,
                    'rank_title': f"{title} (Level {level})",
                    'title_only': title,
                    'total_xp': xp,
                    'current_level_min_xp': min_xp,
                    'next_level_xp': next_level_xp,
                    'xp_in_level': xp_in_level,
                    'xp_needed_in_level': level_span,
                    'level_progress_pct': progress_pct,
                }
        return {
            'level': 1,
            'rank_title': "Novice Analyst (Level 1)",
            'title_only': "Novice Analyst",
            'total_xp': xp,
            'current_level_min_xp': 0,
            'next_level_xp': 800,
            'xp_in_level': xp,
            'xp_needed_in_level': 800,
            'level_progress_pct': min(100, int((xp / 800) * 100)),
        }

    @staticmethod
    def check_in_streak(student_id, username=''):
        profile = ProgressionManagementService.get_or_create_profile(student_id, username)
        res = profile.increment_streak()
        rank_info = ProgressionManagementService.calculate_rank_and_level(profile.total_xp)
        return {
            'streak': profile.streak_count,
            'new_day': res.get('new_day', False),
            'xp_awarded': res.get('xp_awarded', 0),
            'total_xp': profile.total_xp,
            'level': profile.current_level,
            'level_title': rank_info['rank_title'],
            'progress_pct': rank_info['level_progress_pct'],
            'next_level_xp': rank_info['next_level_xp'],
        }

    @staticmethod
    def update_progression(student_id,
                           node_id,
                           username='',
                           hints_used=0):
        profile = ProgressionManagementService\
            .get_or_create_profile(
                student_id, username)
        is_first_completion = node_id not in profile.completed_nodes
        profile.complete_node(node_id)
        streak_result = profile.increment_streak()

        # Award XP: 100 base + 25 if no hints used
        base_xp = 100 if is_first_completion else 25
        hint_bonus = 25 if (hints_used == 0 and is_first_completion) else 0
        total_awarded = base_xp + hint_bonus
        xp_result = profile.add_xp(total_awarded)

        next_node = NODE_UNLOCK_MAP.get(node_id)
        if next_node:
            profile.unlock_node(next_node)
        return {
            'completed_node': node_id,
            'next_node':      next_node,
            'streak':         profile.streak_count,
            'streak_new_day': streak_result.get('new_day', False),
            'unlocked_nodes': profile.unlocked_nodes,
            'xp_awarded':     total_awarded,
            'total_xp':       profile.total_xp,
            'level':          profile.current_level,
            'level_title':    xp_result['level_title'],
            'level_up':       xp_result['level_up'],
            'progress_pct':   xp_result['progress_pct'],
        }

    @staticmethod
    def reset_node(student_id, node_id):
        profile = ProgressionManagementService\
            .get_or_create_profile(student_id)
        if node_id in profile.completed_nodes:
            profile.completed_nodes.remove(node_id)
            profile.save()
        return profile

    @staticmethod
    def complete_onboarding(student_id):
        profile = ProgressionManagementService\
            .get_or_create_profile(student_id)
        profile.complete_onboarding()
        return profile