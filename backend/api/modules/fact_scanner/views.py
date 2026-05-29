# backend/api/modules/fact_scanner/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import (
    ProgressionManagementService)
from api.scaffold.scaffold_service import (
    ScaffoldEngineService)
from .mongo_models import ArticleDocument
from .services import ContentManagementService


class NodeLoadView(APIView):
    """UC-FAC-01"""
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


class EvaluateSentenceView(APIView):
    """UC-FAC-02"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        sentence_id = request.data.get(
            'sentence_id')

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        sentence = node.get_sentence(sentence_id)
        if not sentence:
            return Response(
                {'error': 'Sentence not found.'},
                status=status.HTTP_404_NOT_FOUND)

        is_correct = sentence.is_flawed

        ScaffoldEngineService.log_attempt(
            student_id=student_id,
            node_id=node_id,
            module='fact_scanner',
            is_correct=is_correct,
            word_id=sentence_id,
        )

        if is_correct:
            return Response({
                'result':      'correct',
                'flaw_reason': sentence.flaw_reason,
            })

        return Response({'result': 'incorrect'})


class FeedbackView(APIView):
    """UC-FAC-03"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        sentence_id = request.data.get(
            'sentence_id', '')
        inactivity  = request.data.get(
            'inactivity_seconds', 0)

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        explanation = node.get_sentence_explanation(
            sentence_id)

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
    """UC-FAC-04"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id      = str(request.user.id)
        quarantined_ids = request.data.get(
            'quarantined_ids', [])

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        all_flawed = node.get_all_flawed_ids()
        remaining  = [
            fid for fid in all_flawed
            if fid not in quarantined_ids
        ]

        if not remaining:
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
            'status':               'incomplete',
            'remaining_flawed_ids': remaining,
        }, status=status.HTTP_400_BAD_REQUEST)