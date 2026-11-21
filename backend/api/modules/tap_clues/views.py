# backend/api/modules/tap_clues/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

import re

from api.progression.services import (
    ProgressionManagementService)
from api.scaffold.scaffold_service import (
    ScaffoldEngineService)
from .mongo_models import VocabularyNodeDocument
from .services import ContentManagementService


def _clean_str(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def _stem_str(s: str) -> str:
    w = _clean_str(s)
    if w.endswith('ing') and len(w) > 5: return w[:-3]
    if w.endswith('ies') and len(w) > 4: return w[:-3] + 'y'
    if w.endswith('es') and len(w) > 4: return w[:-2]
    if w.endswith('ed') and len(w) > 4: return w[:-2]
    if w.endswith('ly') and len(w) > 4: return w[:-2]
    if w.endswith('s') and len(w) > 3: return w[:-1]
    return w


def _clue_matches(clue: str, tapped: str) -> bool:
    if not clue or not tapped:
        return False
    c_clean = _clean_str(clue)
    w_clean = _clean_str(tapped)
    if not c_clean or not w_clean:
        return False
    if c_clean == w_clean:
        return True
    c_tokens = [_clean_str(t) for t in re.split(r'[\s\-_/]+', clue.lower()) if _clean_str(t)]
    w_tokens = [_clean_str(t) for t in re.split(r'[\s\-_/]+', tapped.lower()) if _clean_str(t)]
    if w_clean in c_tokens or c_clean in w_tokens:
        return True
    if any(t in w_tokens for t in c_tokens):
        return True
    c_stem = _stem_str(c_clean)
    w_stem = _stem_str(w_clean)
    if len(c_stem) >= 3 and len(w_stem) >= 3:
        if c_stem == w_stem:
            return True
        if any(_stem_str(t) == w_stem for t in c_tokens):
            return True
        if any(_stem_str(t) == c_stem for t in w_tokens):
            return True
    if min(len(c_clean), len(w_clean)) >= 3:
        if c_clean in w_clean or w_clean in c_clean:
            return True
        if any(len(ct) >= 3 and (ct in w_clean or w_clean in ct) for ct in c_tokens):
            return True
    return False


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

        # Clean input
        clean_clue = (clue_word or '').strip().lower().strip('.,!?;:"\'')
        correct_clues_raw = locked_word.correct_clue_ids or []
        correct_clues_clean = [c.strip().lower().strip('.,!?;:"\'') for c in correct_clues_raw]

        # Check match against any correct clue phrase or component word
        matched_target = None
        for orig in correct_clues_raw:
            if _clue_matches(orig, clue_word):
                matched_target = orig
                break

        is_correct = matched_target is not None

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

        # Add to found clues (preserve order and uniqueness)
        resolved_clue = matched_target or clue_word
        updated_found = list(dict.fromkeys(found_clues + [resolved_clue]))

        # Check if all clues are found
        remaining = [
            c for c in correct_clues_raw
            if not any(_clue_matches(c, f) for f in updated_found)
        ]

        target_count = len(correct_clues_raw)

        if remaining and len(updated_found) < target_count:
            return Response({
                'result':             'correct',
                'found_clues':        updated_found,
                'target_clues_count': target_count,
                'remaining_count':    len(remaining),
            })

        # All clues found — unlock the word
        return Response({
            'result':             'correct',
            'all_clues_found':    True,
            'found_clues':        updated_found,
            'target_clues_count': target_count,
            'definition':         locked_word.definition,
            'contextual_usage':   locked_word.contextual_usage,
            'translation':        locked_word.translation,
            'word':               locked_word.word,
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
        hints_used        = int(request.data.get('hints_used', 0) or 0)

        if commit_only:
            result = ProgressionManagementService\
                .update_progression(
                    student_id=student_id,
                    node_id=node_id,
                    username=request.user.email,
                    hints_used=hints_used,
                )
            return Response({
                'status':       'mastered',
                'next_node':    result['next_node'],
                'streak':       result['streak'],
                'xp_awarded':   result.get('xp_awarded', 0),
                'total_xp':     result.get('total_xp', 0),
                'level':        result.get('level', 1),
                'level_title':  result.get('level_title', ''),
                'level_up':     result.get('level_up', False),
                'progress_pct': result.get('progress_pct', 0),
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
                    hints_used=hints_used,
                )
            return Response({
                'status':       'mastered',
                'next_node':    result['next_node'],
                'streak':       result['streak'],
                'xp_awarded':   result.get('xp_awarded', 0),
                'total_xp':     result.get('total_xp', 0),
                'level':        result.get('level', 1),
                'level_title':  result.get('level_title', ''),
                'level_up':     result.get('level_up', False),
                'progress_pct': result.get('progress_pct', 0),
            })

        return Response({
            'status':              'incomplete',
            'remaining_word_ids':  remaining,
        }, status=status.HTTP_400_BAD_REQUEST)