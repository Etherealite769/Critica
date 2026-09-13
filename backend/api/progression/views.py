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
        student_id = str(request.user.id)
        profile = ProgressionManagementService.get_or_create_profile(
            student_id, request.user.email)
        completed_count = len(profile.completed_nodes)

        # 1. Query telemetry logs with safe fallback for unmigrated or fresh cloud databases
        has_telemetry = False
        total_attempts = 0
        correct_attempts = 0
        hints_used_count = 0
        telemetry_qs = []

        try:
            from api.scaffold.models import TelemetryLog
            qs = TelemetryLog.objects.filter(student_id=student_id).order_by('-timestamp')
            total_attempts = qs.count()
            correct_attempts = qs.filter(is_correct=True).count()
            hints_used_count = qs.filter(hint_used=True).count()
            telemetry_qs = qs
            has_telemetry = True
        except Exception:
            has_telemetry = False

        # If telemetry table is empty or unpopulated, use profile node milestones
        if total_attempts == 0 and completed_count > 0:
            total_attempts = completed_count
            correct_attempts = completed_count
            overall_accuracy = 100
            hint_independence = 100
        else:
            overall_accuracy = round((correct_attempts / total_attempts) * 100) if total_attempts > 0 else 100
            hint_independence = round(((total_attempts - hints_used_count) / total_attempts) * 100) if total_attempts > 0 else 100

        # Module breakdown
        modules = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
        module_stats = {}
        for m in modules:
            valid_nodes = MODULE_NODES.get(m, [])
            completed_in_mod = [nid for nid in profile.completed_nodes if nid in valid_nodes]
            comp_len = len(completed_in_mod)

            if has_telemetry and total_attempts > 0:
                m_qs = telemetry_qs.filter(module=m)
                m_tot = m_qs.count()
                m_cor = m_qs.filter(is_correct=True).count()
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
        if has_telemetry:
            try:
                for log in telemetry_qs[:10]:
                    recent_activity.append({
                        'node_id': log.node_id,
                        'module': log.module,
                        'is_correct': log.is_correct,
                        'hint_used': log.hint_used,
                        'hint_tier': log.hint_tier,
                        'timestamp': log.timestamp.strftime('%b %d, %H:%M'),
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

        # Clearance rank based on completed nodes & streak
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

    
