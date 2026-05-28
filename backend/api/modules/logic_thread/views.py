from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import (
    ProgressionManagementService)
from api.scaffold.scaffold_service import (
    ScaffoldEngineService)
from .mongo_models import LogicThreadNodeDocument


class NodeLoadView(APIView):
    """
    UC-LOG-01 — Load micro-lesson and passage.
    GET /api/nodes/logic-thread/<node_id>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, node_id):
        student_id = str(request.user.id)

        if not ProgressionManagementService\
                .is_node_unlocked(student_id, node_id):
            return Response(
                {'error': 'Node is locked.'},
                status=status.HTTP_403_FORBIDDEN)

        node = LogicThreadNodeDocument.objects(
            node_id=node_id).first()
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        return Response({
            'node_id':            node.node_id,
            'title':              node.title,
            'focus':              node.focus,
            'micro_lesson_text':  node.micro_lesson_text,
            'reading_passage':    node.reading_passage,
            'deep_dive_required': node.word_count > 300,
            'paragraph_blocks': [
                {
                    'block_id': b.block_id,
                    'text':     b.text,
                }
                for b in node.paragraph_blocks
            ],
        })


class EvaluateConnectionView(APIView):
    """
    UC-LOG-02 — Evaluate one connection attempt.
    POST /api/nodes/logic-thread/<node_id>/
         evaluate-connection/
    Body: { source_id, target_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id = str(request.user.id)
        source_id  = request.data.get('source_id')
        target_id  = request.data.get('target_id')

        node = LogicThreadNodeDocument.objects(
            node_id=node_id).first()
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        seq = node.correct_sequence
        is_correct = (
            source_id in seq
            and target_id in seq
            and seq.index(target_id)
                == seq.index(source_id) + 1
        )

        ScaffoldEngineService.log_attempt(
            student_id=student_id,
            node_id=node_id,
            module='logic_thread',
            is_correct=is_correct,
        )

        return Response({
            'result': 'correct' if is_correct
                      else 'incorrect'
        })


class FeedbackView(APIView):
    """
    UC-LOG-03 — Get explanation + scaffold hint.
    POST /api/nodes/logic-thread/<node_id>/feedback/
    Body: { source_id, target_id,
            student_id, inactivity_seconds }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        source_id   = request.data.get(
            'source_id', '')
        target_id   = request.data.get(
            'target_id', '')
        inactivity  = request.data.get(
            'inactivity_seconds', 0)

        node = LogicThreadNodeDocument.objects(
            node_id=node_id).first()
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        explanation = node.get_explanation(
            source_id, target_id)

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
    """
    UC-LOG-04 — Submit final sequence for mastery.
    POST /api/nodes/logic-thread/<node_id>/mastery/
    Body: { sequence: [block_id, ...] }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id = str(request.user.id)
        submitted  = request.data.get('sequence', [])

        node = LogicThreadNodeDocument.objects(
            node_id=node_id).first()
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        if submitted == node.correct_sequence:
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

        # Find which blocks are in the wrong position
        correct   = node.correct_sequence
        incorrect = [
            b for i, b in enumerate(submitted)
            if i >= len(correct)
            or b != correct[i]
        ]

        return Response({
            'status':        'incomplete',
            'incorrect_ids': incorrect,
        }, status=status.HTTP_400_BAD_REQUEST)