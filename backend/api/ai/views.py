# backend/api/ai/views.py
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import ProgressionManagementService
from api.scaffold.scaffold_service import (
    ScaffoldEngineService, EVENT_CASE, EVENT_STEP, EVENT_HINT)
from .session_service import SessionService
from .gemini_client import GeminiClient
from .mongo_models import GeneratedSessionDocument

logger = logging.getLogger(__name__)


def _owned_session(request, session_id):
    """
    Returns (session_doc, None) when the session exists and belongs to request.user,
    otherwise (None, error Response): 404 if it does not exist, 403 if it is someone else's.
    """
    session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
    if not session_doc:
        return None, Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
    if session_doc.student_id != str(request.user.id):
        logger.warning("Session %s requested by student %s, owned by %s",
                       session_id, request.user.id, session_doc.student_id)
        return None, Response({'error': 'This session belongs to another student.'}, status=status.HTTP_403_FORBIDDEN)
    return session_doc, None


class AIHealthCheckView(APIView):
    """
    GET /api/ai/status/
    Returns AI service status, active model, and SDK availability.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        client = GeminiClient()
        return Response({
            'status': 'online' if client.is_available() else 'offline_fallback',
            'sdk_type': client.sdk_type,
            'api_configured': bool(client.api_key),
        }, status=status.HTTP_200_OK)


class SessionLoadView(APIView):
    """
    GET /api/ai/session/<module>/<node_id>/?fresh=true
    Loads an active session or dynamically generates a fresh 5-question AI session for the node attempt.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, module, node_id):
        student_id = str(request.user.id)

        # Ensure student has unlocked this node
        if not ProgressionManagementService.is_node_unlocked(student_id, node_id):
            return Response({'error': 'Node is locked.'}, status=status.HTTP_403_FORBIDDEN)

        force_fresh = request.query_params.get('fresh', 'false').lower() in ('true', '1')

        try:
            session_payload = SessionService.start_or_get_session(
                student_id=student_id,
                module=module,
                node_id=node_id,
                force_fresh=force_fresh
            )
            return Response(session_payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f"Failed to load AI session: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SessionRegenerateView(APIView):
    """
    POST /api/ai/session/<module>/<node_id>/regenerate/
    Forces generation of a brand-new 5-question AI session with guaranteed novel questions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, module, node_id):
        student_id = str(request.user.id)

        if not ProgressionManagementService.is_node_unlocked(student_id, node_id):
            return Response({'error': 'Node is locked.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            session_payload = SessionService.start_or_get_session(
                student_id=student_id,
                module=module,
                node_id=node_id,
                force_fresh=True
            )
            return Response(session_payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f"Failed to regenerate session: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SessionEvaluateStepView(APIView):
    """
    POST /api/ai/session/<session_id>/evaluate/<exercise_index>/
    Evaluates student's answer for an individual exercise step in the AI-generated session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, exercise_index):
        session_doc, denied = _owned_session(request, session_id)
        if denied:
            return denied

        result = SessionService.evaluate_exercise_submission(
            session_id=session_id,
            exercise_index=int(exercise_index),
            submission_payload=request.data
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # One "case" event per exercise submit; node and module come from the session, not the client
        ScaffoldEngineService.log_attempt(
            student_id=session_doc.student_id,
            node_id=session_doc.node_id,
            module=session_doc.module,
            is_correct=result.get('is_correct', False),
            event_type=EVENT_CASE,
        )

        return Response(result, status=status.HTTP_200_OK)


class SessionFeedbackView(APIView):
    """
    POST /api/ai/session/<session_id>/feedback/<exercise_index>/
    Body: { tier, source_id, target_id, pair_id, selected_tile, word_id, clue_word, sentence_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, exercise_index):
        session_doc, denied = _owned_session(request, session_id)
        if denied:
            return denied

        feedback_data = request.data
        res = SessionService.get_exercise_feedback(
            session_id=session_id,
            exercise_index=int(exercise_index),
            feedback_query=feedback_data
        )

        try:
            tier = int(feedback_data.get('tier', 1))
        except (TypeError, ValueError):
            tier = 1

        # Every tier is a hint request. It is stored as is_correct=False, but metrics only
        # score "case" events, so hints never count as wrong answers.
        ScaffoldEngineService.log_attempt(
            student_id=session_doc.student_id,
            node_id=session_doc.node_id,
            module=session_doc.module,
            is_correct=False,
            event_type=EVENT_HINT,
            hint_used=True,
            hint_tier=tier,
            word_id=feedback_data.get('word_id', ''),
            clue_word_id=feedback_data.get('clue_word', ''),
        )

        return Response(res, status=status.HTTP_200_OK)


class SessionLogAttemptView(APIView):
    """
    POST /api/ai/session/<session_id>/log-attempt/
    Body: { is_correct: bool, word_id, clue_word, pair_id, selected_tile }
    Logs individual tap or step attempts for telemetry and accuracy calculations.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        # Unknown session: 404 and nothing is logged
        session_doc, denied = _owned_session(request, session_id)
        if denied:
            return denied

        raw_correct = request.data.get('is_correct', False)
        if isinstance(raw_correct, str):
            is_correct = raw_correct.strip().lower() in ('true', '1')
        else:
            is_correct = bool(raw_correct)

        ScaffoldEngineService.log_attempt(
            student_id=session_doc.student_id,
            node_id=session_doc.node_id,
            module=session_doc.module,
            is_correct=is_correct,
            event_type=EVENT_STEP,
            word_id=request.data.get('word_id', ''),
            clue_word_id=request.data.get('clue_word', ''),
        )

        return Response({'status': 'logged'})


class SessionLiveHintView(APIView):
    """
    POST /api/ai/session/<session_id>/live-hint/<exercise_index>/
    Body: { submission_state, error_count }
    Generates dynamic Socratic hints on demand.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, exercise_index):
        payload = request.data.get('submission_state', request.data)
        error_count = int(request.data.get('error_count', 1))

        res = SessionService.get_live_socratic_hint(
            session_id=session_id,
            exercise_index=int(exercise_index),
            submission_payload=payload,
            error_count=error_count,
        )
        return Response(res, status=status.HTTP_200_OK)


class SessionMasteryView(APIView):
    """
    POST /api/ai/session/<session_id>/mastery/
    Marks the dynamic AI session as mastered, increments streak, and unlocks next node in progression graph.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        student_id = str(request.user.id)
        email = getattr(request.user, 'email', '')

        result = SessionService.complete_session(
            session_id=session_id,
            student_id=student_id,
            username=email
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class SessionProgressView(APIView):
    """
    POST /api/ai/session/<session_id>/progress/
    Body: { current_index: int }
    Saves and updates the student's current question progress for an active AI session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        current_index = request.data.get('current_index')
        if current_index is None:
            return Response({'error': 'current_index is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            current_index = int(current_index)
        except (ValueError, TypeError):
            return Response({'error': 'current_index must be an integer'}, status=status.HTTP_400_BAD_REQUEST)

        result = SessionService.update_session_progress(
            session_id=session_id,
            current_index=current_index
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_404_NOT_FOUND)

        return Response(result, status=status.HTTP_200_OK)

