# backend/api/progression/views.py
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import (
    ProgressionManagementService,
    MODULE_NODES,
    MODULE_ENTRY_NODES,
    ALWAYS_UNLOCKED,
)

logger = logging.getLogger(__name__)




class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        student_id = str(request.user.id)
        profile = ProgressionManagementService\
            .get_or_create_profile(
                student_id,
                request.user.email)

        module_status = {}
        for mod_key, node_ids in \
                MODULE_NODES.items():
            entry = MODULE_ENTRY_NODES[mod_key]
            mod_unlocked = (
                entry in profile.unlocked_nodes)
            nodes = []
            for nid in node_ids:
                if nid in profile.completed_nodes:
                    st = 'completed'
                elif nid in profile.unlocked_nodes or nid in ALWAYS_UNLOCKED:
                    st = 'unlocked'
                else:
                    st = 'locked'
                nodes.append({
                    'node_id': nid,
                    'status':  st,
                })
            module_status[mod_key] = {
                'module_unlocked': mod_unlocked,
                'nodes':           nodes,
            }

        rank_info = ProgressionManagementService.calculate_rank_and_level(getattr(profile, 'total_xp', 0))
        return Response({
            'student_id':      student_id,
            'username':        profile.username,
            'first_name':      request.user.first_name,
            'last_name':       request.user.last_name,
            'streak':          profile.streak_count,
            'total_xp':        rank_info['total_xp'],
            'level':           rank_info['level'],
            'rank_title':      rank_info['rank_title'],
            'next_level_xp':   rank_info['next_level_xp'],
            'level_progress_pct': rank_info['level_progress_pct'],
            'completed_count': len(
                profile.completed_nodes),
            'unlocked_nodes':  list(set(profile.unlocked_nodes + ALWAYS_UNLOCKED)),
            'completed_nodes': profile.completed_nodes,
            'onboarding_completed': getattr(profile, 'onboarding_completed', False),
            'profile_picture': getattr(request.user, 'profile_picture', '') or getattr(profile, 'profile_picture', '') or '',
            'module_status':   module_status,
        })


class ModuleNodesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, module_key):
        student_id = str(request.user.id)
        profile = ProgressionManagementService\
            .get_or_create_profile(
                student_id,
                request.user.email)
        node_ids = MODULE_NODES.get(module_key)
        if not node_ids:
            return Response(
                {'error': 'Module not found.'},
                status=404)
        nodes = []
        for nid in node_ids:
            if nid in profile.completed_nodes:
                st = 'completed'
            elif nid in profile.unlocked_nodes or nid in ALWAYS_UNLOCKED:
                st = 'unlocked'
            else:
                st = 'locked'
            nodes.append({'node_id': nid,
                          'status':  st})
        return Response({
            'module_key': module_key,
            'nodes':      nodes,
        })


class NodeResetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        node_id    = request.data.get('node_id')
        if not node_id:
            return Response(
                {'error': 'node_id is required.'},
                status=400)

        profile = ProgressionManagementService.reset_node(
            student_id, node_id)
        return Response({
            'status':          'reset',
            'completed_nodes': profile.completed_nodes,
        })


class OnboardingCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        profile = ProgressionManagementService.complete_onboarding(student_id)
        return Response({
            'status':               'success',
            'onboarding_completed': getattr(profile, 'onboarding_completed', True),
        })


class StudentMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = str(request.user.id)
        profile = ProgressionManagementService.get_or_create_profile(
            student_id, request.user.email)
        completed_count = len(profile.completed_nodes)

        # 1. Query telemetry logs: Primary from MongoDB Atlas, fallback to SQLite
        telemetry_records = []
        try:
            from api.scaffold.mongo_models import TelemetryLogDocument
            telemetry_records = list(TelemetryLogDocument.objects(student_id=student_id).order_by('-timestamp'))
        except Exception as e:
            logger.warning("Metrics: MongoDB telemetry read failed for %s: %s", student_id, e)

        if not telemetry_records:
            try:
                from api.scaffold.models import TelemetryLog
                telemetry_records = list(TelemetryLog.objects.filter(student_id=student_id).order_by('-timestamp'))
            except Exception as e:
                logger.warning("Metrics: SQLite telemetry read failed for %s: %s", student_id, e)

        # 2. Pick the scoring rule.
        #    events: rows carry event_type; accuracy is scored on "case" rows only, hints are counted apart.
        #    legacy: only pre-event-type rows exist; every row counts, as before.
        #    none:   no telemetry at all; nothing is invented.
        event_rows = [log for log in telemetry_records if getattr(log, 'event_type', '')]
        if event_rows:
            metrics_source = 'events'
            scored_rows = [log for log in event_rows if log.event_type == 'case']
            hints_used_count = sum(1 for log in event_rows if log.event_type == 'hint')
        elif telemetry_records:
            metrics_source = 'legacy'
            scored_rows = telemetry_records
            hints_used_count = sum(1 for log in telemetry_records if log.hint_used)
        else:
            metrics_source = 'none'
            scored_rows = []
            hints_used_count = 0

        case_count = len(scored_rows)
        total_attempts = case_count
        correct_attempts = sum(1 for log in scored_rows if log.is_correct)

        def pct(part, whole):
            return round((part / whole) * 100) if whole > 0 else None

        overall_accuracy = pct(correct_attempts, total_attempts)
        if case_count > 0:
            hint_independence = max(0, min(100, round(100 * (1 - hints_used_count / case_count))))
        else:
            hint_independence = None

        # Module breakdown
        modules = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
        module_stats = {}
        for m in modules:
            valid_nodes = MODULE_NODES.get(m, [])
            completed_in_mod = [nid for nid in profile.completed_nodes if nid in valid_nodes]
            comp_len = len(completed_in_mod)

            m_logs = [log for log in scored_rows if log.module == m]
            m_tot = len(m_logs)
            m_cor = sum(1 for log in m_logs if log.is_correct)
            m_acc = pct(m_cor, m_tot)

            # Forensic Competency Level
            if m_acc is None:
                c_level = "Unassessed"
            elif m_acc >= 95:
                c_level = "Master"
            elif m_acc >= 80:
                c_level = "Expert"
            elif m_acc >= 60:
                c_level = "Investigator"
            elif m_acc >= 40:
                c_level = "Apprentice"
            else:
                c_level = "Novice"

            module_stats[m] = {
                'attempts': m_tot,
                'correct': m_cor,
                'accuracy': m_acc,
                'completed_nodes': comp_len,
                'total_nodes': len(valid_nodes),
                'competency_level': c_level,
            }

        # Recent timeline
        recent_activity = []
        for log in telemetry_records[:10]:
            ts = getattr(log, 'timestamp', None)
            recent_activity.append({
                'node_id': log.node_id,
                'module': log.module,
                'event_type': getattr(log, 'event_type', '') or '',
                'is_correct': log.is_correct,
                'hint_used': log.hint_used,
                'hint_tier': getattr(log, 'hint_tier', 0),
                'timestamp': ts.strftime('%b %d, %H:%M') if ts else 'Recent',
            })

        if not recent_activity and completed_count > 0:
            for nid in reversed(profile.completed_nodes[-5:]):
                mod_name = 'logic_thread' if nid.startswith('log') else ('snap_gap' if nid.startswith('snp') else ('tap_clues' if nid.startswith('tap') else 'fact_scanner'))
                recent_activity.append({
                    'node_id': nid,
                    'module': mod_name,
                    'event_type': '',
                    'is_correct': True,
                    'hint_used': False,
                    'hint_tier': None,
                    'timestamp': 'Verified Record',
                })

        # Clearance rank based on calculated total_xp and level engine
        rank_info = ProgressionManagementService.calculate_rank_and_level(getattr(profile, 'total_xp', 0))

        # Overall forensic clearance grade
        if overall_accuracy is None:
            overall_grade = {'tier': '-', 'title': 'NO DATA YET', 'color': '#BEA791'}
        elif overall_accuracy >= 95 and completed_count >= 10:
            overall_grade = {'tier': 'S', 'title': 'CHIEF INSPECTOR CLEARANCE', 'color': '#FFD700'}
        elif overall_accuracy >= 80:
            overall_grade = {'tier': 'A', 'title': 'SENIOR INVESTIGATOR', 'color': '#4DDD94'}
        elif overall_accuracy >= 60:
            overall_grade = {'tier': 'B', 'title': 'FIELD DETECTIVE', 'color': '#BEA791'}
        elif overall_accuracy >= 40:
            overall_grade = {'tier': 'C', 'title': 'JUNIOR OPERATIVE', 'color': '#F3A712'}
        else:
            overall_grade = {'tier': 'D', 'title': 'PROBATIONARY CADET', 'color': '#EF4444'}

        return Response({
            'student_id': student_id,
            'username': profile.username,
            'streak': profile.streak_count,
            'completed_count': completed_count,
            'total_xp': rank_info['total_xp'],
            'rank_title': rank_info['rank_title'],
            'rank_level': rank_info['level'],
            'current_level_min_xp': rank_info['current_level_min_xp'],
            'next_level_xp': rank_info['next_level_xp'],
            'xp_in_level': rank_info['xp_in_level'],
            'xp_needed_in_level': rank_info['xp_needed_in_level'],
            'level_progress_pct': rank_info['level_progress_pct'],
            'total_attempts': total_attempts,
            'correct_attempts': correct_attempts,
            'overall_accuracy': overall_accuracy,
            'overall_grade': overall_grade,
            'hint_independence': hint_independence,
            'hints_used_count': hints_used_count,
            'case_count': case_count,
            'metrics_source': metrics_source,
            'module_stats': module_stats,
            'recent_activity': recent_activity,
        })


class StreakCheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        res = ProgressionManagementService.check_in_streak(
            student_id, request.user.email)
        return Response(res)


    
