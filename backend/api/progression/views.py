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

        return Response({
            'student_id':      student_id,
            'username':        profile.username,
            'first_name':      request.user.first_name,
            'last_name':       request.user.last_name,
            'streak':          profile.streak_count,
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
        from api.scaffold.models import TelemetryLog

        student_id = str(request.user.id)
        profile = ProgressionManagementService.get_or_create_profile(
            student_id, request.user.email)

        # 1. Query telemetry logs from SQLite
        telemetry_qs = TelemetryLog.objects.filter(student_id=student_id).order_by('-timestamp')
        total_attempts = telemetry_qs.count()
        correct_attempts = telemetry_qs.filter(is_correct=True).count()
        hints_used_count = telemetry_qs.filter(hint_used=True).count()

        overall_accuracy = round((correct_attempts / total_attempts) * 100) if total_attempts > 0 else 100
        hint_independence = round(((total_attempts - hints_used_count) / total_attempts) * 100) if total_attempts > 0 else 100

        # Module breakdown
        modules = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
        module_stats = {}
        for m in modules:
            m_qs = telemetry_qs.filter(module=m)
            m_tot = m_qs.count()
            m_cor = m_qs.filter(is_correct=True).count()
            m_acc = round((m_cor / m_tot) * 100) if m_tot > 0 else 0

            # completed count in this module
            completed_in_mod = [nid for nid in profile.completed_nodes if nid.startswith(m[:3])]
            module_stats[m] = {
                'attempts': m_tot,
                'correct': m_cor,
                'accuracy': m_acc,
                'completed_nodes': len(completed_in_mod),
            }

        # Recent timeline
        recent_activity = []
        for log in telemetry_qs[:10]:
            recent_activity.append({
                'node_id': log.node_id,
                'module': log.module,
                'is_correct': log.is_correct,
                'hint_used': log.hint_used,
                'hint_tier': log.hint_tier,
                'timestamp': log.timestamp.strftime('%b %d, %H:%M'),
            })

        # Clearance rank based on completed nodes & streak
        completed_count = len(profile.completed_nodes)
        if completed_count >= 12:
            rank_title = "Chief Inspector (Level 4)"
            rank_level = 4
        elif completed_count >= 6:
            rank_title = "Senior Case Officer (Level 3)"
            rank_level = 3
        elif completed_count >= 2:
            rank_title = "Field Investigator (Level 2)"
            rank_level = 2
        else:
            rank_title = "Novice Analyst (Level 1)"
            rank_level = 1

        return Response({
            'student_id': student_id,
            'username': profile.username,
            'streak': profile.streak_count,
            'completed_count': completed_count,
            'rank_title': rank_title,
            'rank_level': rank_level,
            'total_attempts': total_attempts,
            'correct_attempts': correct_attempts,
            'overall_accuracy': overall_accuracy,
            'hint_independence': hint_independence,
            'module_stats': module_stats,
            'recent_activity': recent_activity,
        })
    
