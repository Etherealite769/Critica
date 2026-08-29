# backend/api/ai/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from api.progression.services import ProgressionManagementService
from api.scaffold.scaffold_service import ScaffoldEngineService
from .session_service import SessionService
from .gemini_client import GeminiClient


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
        student_id = str(request.user.id)
        submission_payload = request.data

        result = SessionService.evaluate_exercise_submission(
            session_id=session_id,
            exercise_index=int(exercise_index),
            submission_payload=submission_payload
        )

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Log attempt telemetry
        is_correct = result.get('is_correct', False)
        ScaffoldEngineService.log_attempt(
            student_id=student_id,
            node_id=submission_payload.get('node_id', ''),
            module=submission_payload.get('module', ''),
            is_correct=is_correct,
        )

        return Response(result, status=status.HTTP_200_OK)


class SessionFeedbackView(APIView):
    """
    POST /api/ai/session/<session_id>/feedback/<exercise_index>/
    Body: { tier, source_id, target_id, pair_id, selected_tile, word_id, clue_word, sentence_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, exercise_index):
        feedback_data = request.data
        res = SessionService.get_exercise_feedback(
            session_id=session_id,
            exercise_index=int(exercise_index),
            feedback_query=feedback_data
        )
        return Response(res, status=status.HTTP_200_OK)


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
