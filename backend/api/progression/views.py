# backend/api/progression/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import (
    ProgressionManagementService,
    MODULE_NODES,
    MODULE_ENTRY_NODES,
)




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
                elif nid in profile.unlocked_nodes:
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
            'unlocked_nodes':  profile.unlocked_nodes,
            'completed_nodes': profile.completed_nodes,
            'onboarding_completed': getattr(profile, 'onboarding_completed', False),
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
            elif nid in profile.unlocked_nodes:
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
        has_telemetry = False
        total_attempts = 0
        correct_attempts = 0
        hints_used_count = 0
        telemetry_records = []

        try:
            from api.scaffold.mongo_models import TelemetryLogDocument
            mongo_logs = list(TelemetryLogDocument.objects(student_id=student_id).order_by('-timestamp'))
            if mongo_logs:
                total_attempts = len(mongo_logs)
                correct_attempts = sum(1 for log in mongo_logs if log.is_correct)
                hints_used_count = sum(1 for log in mongo_logs if log.hint_used)
                telemetry_records = mongo_logs
                has_telemetry = True
        except Exception:
            has_telemetry = False

        if not has_telemetry:
            try:
                from api.scaffold.models import TelemetryLog
                qs = list(TelemetryLog.objects.filter(student_id=student_id).order_by('-timestamp'))
                if qs:
                    total_attempts = len(qs)
                    correct_attempts = sum(1 for log in qs if log.is_correct)
                    hints_used_count = sum(1 for log in qs if log.hint_used)
                    telemetry_records = qs
                    has_telemetry = True
            except Exception:
                pass

        # If telemetry table is empty or unpopulated, use profile node milestones
        if total_attempts == 0 and completed_count > 0:
            total_attempts = completed_count
            correct_attempts = completed_count
            overall_accuracy = 100
            hint_independence = 100
        else:
            overall_accuracy = round((correct_attempts / total_attempts) * 100) if total_attempts > 0 else 0
            hint_independence = round(((total_attempts - hints_used_count) / total_attempts) * 100) if total_attempts > 0 else 100

        # Module breakdown
        modules = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
        module_stats = {}
        for m in modules:
            valid_nodes = MODULE_NODES.get(m, [])
            completed_in_mod = [nid for nid in profile.completed_nodes if nid in valid_nodes]
            comp_len = len(completed_in_mod)

            if has_telemetry and total_attempts > 0:
                m_logs = [log for log in telemetry_records if log.module == m]
                m_tot = len(m_logs)
                m_cor = sum(1 for log in m_logs if log.is_correct)
                m_acc = round((m_cor / m_tot) * 100) if m_tot > 0 else (100 if comp_len > 0 else 0)
            else:
                m_tot = comp_len
                m_cor = comp_len
                m_acc = 100 if comp_len > 0 else 0

            module_stats[m] = {
                'attempts': m_tot,
                'correct': m_cor,
                'accuracy': m_acc,
                'completed_nodes': comp_len,
            }

        # Recent timeline
        recent_activity = []
        if has_telemetry and telemetry_records:
            try:
                for log in telemetry_records[:10]:
                    ts_str = log.timestamp.strftime('%b %d, %H:%M') if getattr(log, 'timestamp', None) else 'Recent'
                    recent_activity.append({
                        'node_id': log.node_id,
                        'module': log.module,
                        'is_correct': log.is_correct,
                        'hint_used': log.hint_used,
                        'hint_tier': getattr(log, 'hint_tier', 0),
                        'timestamp': ts_str,
                    })
            except Exception:
                pass

        if not recent_activity and completed_count > 0:
            for nid in reversed(profile.completed_nodes[-5:]):
                mod_name = 'logic_thread' if nid.startswith('log') else ('snap_gap' if nid.startswith('snp') else ('tap_clues' if nid.startswith('tap') else 'fact_scanner'))
                recent_activity.append({
                    'node_id': nid,
                    'module': mod_name,
                    'is_correct': True,
                    'hint_used': False,
                    'hint_tier': None,
                    'timestamp': 'Verified Record',
                })

        # Clearance rank based on calculated total_xp and level engine
        rank_info = ProgressionManagementService.calculate_rank_and_level(getattr(profile, 'total_xp', 0))

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
            'hint_independence': hint_independence,
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


    
