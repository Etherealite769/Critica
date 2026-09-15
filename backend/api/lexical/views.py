from datetime import datetime, timezone, timedelta
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
        'next_review_date': str(datetime.now(timezone.utc)),
        'access_count': 1,
        'is_starter': True,
    },
    {
        'word': 'Corroborate',
        'definition': 'Confirm or give direct empirical support to a statement, theory, or finding.',
        'contextual_usage': 'Secondary satellite telemetry helped corroborate the seismic observations.',
        'translation': 'Verify / Authenticate',
        'next_review_date': str(datetime.now(timezone.utc)),
        'access_count': 1,
        'is_starter': True,
    },
    {
        'word': 'Disparate',
        'definition': 'Essentially different in kind; not allowing direct comparison.',
        'contextual_usage': 'The investigator synthesized findings from disparate intelligence streams into one cohesive thesis.',
        'translation': 'Distinct / Contrasting',
        'next_review_date': str(datetime.now(timezone.utc)),
        'access_count': 1,
        'is_starter': True,
    },
]


class LexicalDeckLogView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        word_data  = request.data.get('word_data')
        if not word_data or not isinstance(word_data, dict):
            word_data = request.data
        task_id    = request.data.get('task_id', '')
        doc = SpacedRepetitionService.schedule_word(
            student_id, word_data, task_id)
        return Response({
            'status': 'logged',
            'word': doc.word if doc else '',
            'next_review_date': str(doc.next_review_date) if doc else '',
        })


class LexicalDeckStatusView(APIView):
    """
    Lightweight endpoint for real-time polling and badge counters
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = str(request.user.id)
        status_info = SpacedRepetitionService.get_deck_status(student_id)
        return Response(status_info)


class LexicalDeckListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = str(request.user.id)
        filter_mode = request.query_params.get('filter', '')
        mode = request.query_params.get('mode', '') or request.query_params.get('format', '')
        now, today_start, today_end, seconds_until_refresh = SpacedRepetitionService.get_day_boundaries()

        words = LexicalReviewDocument.objects(
            student_id=student_id
        ).order_by('next_review_date')

        if not words or words.count() == 0:
            deck_status = {
                'total_count': len(STARTER_VOCABULARY),
                'due_count': len(STARTER_VOCABULARY),
                'reviewed_today_count': 0,
                'future_count': 0,
                'seconds_until_refresh': seconds_until_refresh,
                'is_daily_complete': False,
            }
            if mode == 'enriched':
                return Response({
                    'words': STARTER_VOCABULARY,
                    'daily_words': STARTER_VOCABULARY,
                    'deck_status': deck_status,
                })
            return Response(STARTER_VOCABULARY)

        deck_status = SpacedRepetitionService.get_deck_status(student_id)

        serialized_all = []
        serialized_daily = []

        for w in words:
            # Check if reviewed today
            is_reviewed_today = False
            if w.last_reviewed:
                lr = w.last_reviewed
                if lr.tzinfo is None:
                    lr = lr.replace(tzinfo=timezone.utc)
                if lr >= today_start:
                    is_reviewed_today = True

            # Check if due for review today
            nrd = w.next_review_date
            if nrd and nrd.tzinfo is None:
                nrd = nrd.replace(tzinfo=timezone.utc)
            is_due = (nrd is None or nrd <= now or (nrd <= today_end and not is_reviewed_today))

            card_dict = {
                'word':             w.word,
                'definition':       w.definition,
                'contextual_usage': w.contextual_usage,
                'translation':      w.translation,
                'next_review_date': str(w.next_review_date) if w.next_review_date else '',
                'access_count':     w.access_count,
                'is_starter':       False,
                'is_due_today':     is_due,
                'is_reviewed_today': is_reviewed_today,
            }
            serialized_all.append(card_dict)
            if is_due:
                serialized_daily.append(card_dict)

        if filter_mode == 'daily':
            return Response(serialized_daily)

        if mode == 'enriched':
            return Response({
                'words': serialized_all,
                'daily_words': serialized_daily,
                'deck_status': deck_status,
            })

        # Default: return list of cards for backward compatibility, with daily meta headers or list
        return Response(serialized_all)


class LexicalWordReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = str(request.user.id)
        word = request.data.get('word', '')
        review_result = SpacedRepetitionService.record_review(student_id, word)
        if review_result:
            return Response({
                'status': 'reviewed',
                **review_result
            })
        return Response({'status': 'not_found'}, status=404)