from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import SpacedRepetitionService
from .mongo_models import LexicalReviewDocument

STARTER_VOCABULARY = [
    {
        'word': 'Incongruous',
        'definition': 'Not in harmony or keeping with the surroundings or other aspects of an argument.',
        'contextual_usage': 'The flawed citation appeared incongruous alongside the rigorous peer-reviewed sources.',
        'translation': 'Out of place / Incompatible',
        'next_review_date': str(datetime.utcnow() + timedelta(days=1)),
        'access_count': 1,
        'is_starter': True,
    },
    {
        'word': 'Corroborate',
        'definition': 'Confirm or give direct empirical support to a statement, theory, or finding.',
        'contextual_usage': 'Secondary satellite telemetry helped corroborate the seismic observations.',
        'translation': 'Verify / Authenticate',
        'next_review_date': str(datetime.utcnow() + timedelta(days=2)),
        'access_count': 1,
        'is_starter': True,
    },
    {
        'word': 'Disparate',
        'definition': 'Essentially different in kind; not allowing direct comparison.',
        'contextual_usage': 'The investigator synthesized findings from disparate intelligence streams into one cohesive thesis.',
        'translation': 'Distinct / Contrasting',
        'next_review_date': str(datetime.utcnow() + timedelta(days=3)),
        'access_count': 1,
        'is_starter': True,
    },
]


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

        if not words or words.count() == 0:
            return Response(STARTER_VOCABULARY)

        return Response([{
            'word':             w.word,
            'definition':       w.definition,
            'contextual_usage': w.contextual_usage,
            'translation':      w.translation,
            'next_review_date': str(
                w.next_review_date),
            'access_count':     w.access_count,
            'is_starter':       False,
        } for w in words])


class LexicalWordReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        word = request.data.get('word', '')
        doc = LexicalReviewDocument.objects(student_id=student_id, word=word).first()
        if doc:
            doc.interval_days = max(1, int(doc.interval_days * 2.5))
            doc.access_count += 1
            doc.last_reviewed = datetime.utcnow()
            doc.next_review_date = datetime.utcnow() + timedelta(days=doc.interval_days)
            doc.save()
            return Response({
                'status': 'reviewed',
                'next_review_date': str(doc.next_review_date),
                'interval_days': doc.interval_days
            })
        return Response({'status': 'recorded'})