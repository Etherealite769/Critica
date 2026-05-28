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
            'streak':          profile.streak_count,
            'completed_count': len(
                profile.completed_nodes),
            'unlocked_nodes':  profile.unlocked_nodes,
            'completed_nodes': profile.completed_nodes,
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
    
