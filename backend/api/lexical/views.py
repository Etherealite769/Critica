# backend/api/lexical/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import SpacedRepetitionService
from .mongo_models import LexicalReviewDocument


class LexicalDeckLogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        word_data  = request.data.get(
            'word_data', {})
        task_id    = request.data.get(
            'task_id', '')
        SpacedRepetitionService.schedule_word(
            student_id, word_data, task_id)
        return Response({'status': 'logged'})


class LexicalDeckListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = str(request.user.id)
        words = LexicalReviewDocument.objects(
            student_id=student_id
        ).order_by('next_review_date')
        return Response([{
            'word':             w.word,
            'definition':       w.definition,
            'contextual_usage': w.contextual_usage,
            'translation':      w.translation,
            'next_review_date': str(
                w.next_review_date),
            'access_count':     w.access_count,
        } for w in words])