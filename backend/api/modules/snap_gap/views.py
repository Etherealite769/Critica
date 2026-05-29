# backend/api/modules/snap_gap/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import (
    ProgressionManagementService)
from api.scaffold.scaffold_service import (
    ScaffoldEngineService)
from .mongo_models import CoherenceNodeDocument
from .services import ContentManagementService


class NodeLoadView(APIView):
    """UC-SNP-01"""
    permission_classes = [IsAuthenticated]

    def get(self, request, node_id):
        student_id = str(request.user.id)

        if not ProgressionManagementService\
                .is_node_unlocked(
                    student_id, node_id):
            return Response(
                {'error': 'Node is locked.'},
                status=status.HTTP_403_FORBIDDEN)

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        return Response(
            ContentManagementService
            .serialize_node_payload(node))


class EvaluateGapView(APIView):
    """UC-SNP-02"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id    = str(request.user.id)
        pair_id       = request.data.get(
            'pair_id')
        selected_tile = request.data.get(
            'selected_tile')

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        is_correct = (
            node.get_correct_tile(pair_id)
            == selected_tile
        )

        ScaffoldEngineService.log_attempt(
            student_id=student_id,
            node_id=node_id,
            module='snap_gap',
            is_correct=is_correct,
        )

        return Response({
            'result': 'correct'
                      if is_correct
                      else 'incorrect'
        })


class FeedbackView(APIView):
    """UC-SNP-03"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id    = str(request.user.id)
        pair_id       = request.data.get(
            'pair_id', '')
        selected_tile = request.data.get(
            'selected_tile', '')
        inactivity    = request.data.get(
            'inactivity_seconds', 0)

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        explanation = node.get_tile_explanation(
            pair_id, selected_tile)

        hint      = ''
        hint_tier = 0

        if ScaffoldEngineService.should_trigger(
                student_id, node_id, inactivity):
            hint_tier = ScaffoldEngineService\
                .get_hint_tier(student_id)
            hint = node.get_hint(hint_tier)

        return Response({
            'explanation': explanation,
            'hint':        hint,
            'hint_tier':   hint_tier,
        })


class MasteryView(APIView):
    """UC-SNP-04"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        board_state = request.data.get(
            'board_state', {})

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        incorrect = [
            pid
            for pid, tile in board_state.items()
            if node.get_correct_tile(pid) != tile
        ]

        if not incorrect:
            result = ProgressionManagementService\
                .update_progression(
                    student_id=student_id,
                    node_id=node_id,
                    username=request.user.email,
                )
            return Response({
                'status':    'mastered',
                'next_node': result['next_node'],
                'streak':    result['streak'],
            })

        return Response({
            'status':          'incomplete',
            'incorrect_pairs': incorrect,
        }, status=status.HTTP_400_BAD_REQUEST)