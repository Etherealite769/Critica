# backend/api/modules/tap_clues/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import (
    ProgressionManagementService)
from api.scaffold.scaffold_service import (
    ScaffoldEngineService)
from .mongo_models import VocabularyNodeDocument
from .services import ContentManagementService


class NodeLoadView(APIView):
    """UC-TAP-01"""
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


class EvaluateClueView(APIView):
    """UC-TAP-02"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        word_id     = request.data.get('word_id')
        clue_word   = request.data.get('clue_word')
        found_clues = request.data.get(
            'found_clues', [])

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        locked_word = node.get_locked_word(word_id)
        if not locked_word:
            return Response(
                {'error': 'Word not found.'},
                status=status.HTTP_404_NOT_FOUND)

        is_correct = (
            clue_word in locked_word.correct_clue_ids
        )

        ScaffoldEngineService.log_attempt(
            student_id=student_id,
            node_id=node_id,
            module='tap_clues',
            is_correct=is_correct,
            word_id=word_id,
            clue_word_id=clue_word,
        )

        if not is_correct:
            return Response({'result': 'incorrect'})

        # Add to found clues
        updated_found = list(set(
            found_clues + [clue_word]))

        # Check if all clues are found
        remaining = [
            c for c in locked_word.correct_clue_ids
            if c not in updated_found
        ]

        if remaining:
            return Response({
                'result':      'correct',
                'found_clues': updated_found,
            })

        # All clues found — unlock the word
        return Response({
            'result':          'correct',
            'all_clues_found': True,
            'found_clues':     updated_found,
            'definition':      locked_word.definition,
            'contextual_usage':
                locked_word.contextual_usage,
            'translation':     locked_word.translation,
            'word':            locked_word.word,
        })


class FeedbackView(APIView):
    """UC-TAP-03"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id  = str(request.user.id)
        word_id     = request.data.get(
            'word_id', '')
        clue_word   = request.data.get(
            'clue_word', '')
        inactivity  = request.data.get(
            'inactivity_seconds', 0)

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        explanation = node.get_clue_explanation(
            word_id, clue_word)

        hint      = ''
        hint_tier = 0

        if ScaffoldEngineService.should_trigger(
                student_id, node_id, inactivity):
            hint_tier = ScaffoldEngineService\
                .get_hint_tier(student_id, node_id)
            hint = node.get_hint(hint_tier)

        return Response({
            'explanation': explanation,
            'hint':        hint,
            'hint_tier':   hint_tier,
        })


class MasteryView(APIView):
    """UC-TAP-04"""
    permission_classes = [IsAuthenticated]

    def post(self, request, node_id):
        student_id        = str(request.user.id)
        commit_only       = request.data.get('commit_only', False)

        if commit_only:
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

        unlocked_word_ids = request.data.get(
            'unlocked_word_ids', [])

        node = ContentManagementService\
            .get_node_document(node_id)
        if not node:
            return Response(
                {'error': 'Node not found.'},
                status=status.HTTP_404_NOT_FOUND)

        all_ids   = node.get_all_word_ids()
        remaining = [
            w for w in all_ids
            if w not in unlocked_word_ids
        ]

        if not remaining:
            save_progression = request.data.get('save_progression', True)
            if not save_progression:
                return Response({
                    'status': 'mastered',
                })

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
            'status':              'incomplete',
            'remaining_word_ids':  remaining,
        }, status=status.HTTP_400_BAD_REQUEST)