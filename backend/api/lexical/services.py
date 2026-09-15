from datetime import datetime, timezone, timedelta
from .mongo_models import LexicalReviewDocument
from api.progression.services import ProgressionManagementService

class SpacedRepetitionService:
    EASE = 2.5

    @staticmethod
    def get_day_boundaries():
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        today_end = today_start + timedelta(days=1)
        seconds_until_refresh = max(0, int((today_end - now).total_seconds()))
        return now, today_start, today_end, seconds_until_refresh

    @staticmethod
    def schedule_word(student_id, word_data, task_id=''):
        word_str = (word_data.get('word') or '').strip()
        if not word_str:
            return None

        now, today_start, today_end, _ = SpacedRepetitionService.get_day_boundaries()
        existing = LexicalReviewDocument.objects(
            student_id=student_id,
            word__iexact=word_str
        ).first()

        if existing:
            new_interval = max(1, int(existing.interval_days * SpacedRepetitionService.EASE))
            existing.interval_days = new_interval
            existing.next_review_date = now + timedelta(days=new_interval)
            existing.access_count += 1
            if word_data.get('definition'):
                existing.definition = word_data.get('definition')
            if word_data.get('translation'):
                existing.translation = word_data.get('translation')
            if word_data.get('contextual_usage'):
                existing.contextual_usage = word_data.get('contextual_usage')
            existing.save()
            return existing
        else:
            # When newly logged, make it immediately available for review today
            new_doc = LexicalReviewDocument(
                student_id=student_id,
                word=word_str,
                definition=word_data.get('definition', ''),
                contextual_usage=word_data.get('contextual_usage', ''),
                translation=word_data.get('translation', ''),
                context_task_id=task_id or '',
                interval_days=1,
                next_review_date=now,
                access_count=1,
                first_accessed=now,
            )
            new_doc.save()
            return new_doc

    @staticmethod
    def get_deck_status(student_id):
        now, today_start, today_end, seconds_until_refresh = SpacedRepetitionService.get_day_boundaries()
        all_words = LexicalReviewDocument.objects(student_id=student_id).order_by('next_review_date')
        
        due_words = []
        reviewed_today = []
        future_words = []

        for w in all_words:
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

            if is_reviewed_today:
                reviewed_today.append(w)
            elif is_due:
                due_words.append(w)
            else:
                future_words.append(w)

        return {
            'total_count': all_words.count(),
            'due_count': len(due_words),
            'reviewed_today_count': len(reviewed_today),
            'future_count': len(future_words),
            'seconds_until_refresh': seconds_until_refresh,
            'is_daily_complete': len(due_words) == 0 and len(reviewed_today) > 0,
        }

    @staticmethod
    def record_review(student_id, word):
        now, today_start, today_end, seconds_until_refresh = SpacedRepetitionService.get_day_boundaries()
        doc = LexicalReviewDocument.objects(student_id=student_id, word__iexact=word.strip()).first()
        if not doc:
            return None

        new_interval = max(1, int((doc.interval_days or 1) * SpacedRepetitionService.EASE))
        doc.interval_days = new_interval
        doc.access_count = (doc.access_count or 1) + 1
        doc.last_reviewed = now
        doc.next_review_date = now + timedelta(days=new_interval)
        doc.save()

        # Award +10 XP per flashcard reviewed
        profile = ProgressionManagementService.get_or_create_profile(student_id)
        card_xp = 10
        xp_res = profile.add_xp(card_xp)

        # Check if today's daily deck is now fully cleared
        deck_status = SpacedRepetitionService.get_deck_status(student_id)
        bonus_awarded = 0
        if deck_status['is_daily_complete'] and deck_status['due_count'] == 0:
            # Award +30 XP bonus for completing the daily flashcard quota
            bonus_awarded = 30
            xp_res = profile.add_xp(bonus_awarded)

        # Increment daily streak if not already counted today
        streak_res = profile.increment_streak()

        return {
            'word': doc.word,
            'interval_days': doc.interval_days,
            'next_review_date': str(doc.next_review_date),
            'access_count': doc.access_count,
            'xp_awarded': card_xp + bonus_awarded,
            'bonus_awarded': bonus_awarded,
            'total_xp': profile.total_xp,
            'level': profile.current_level,
            'level_title': xp_res['level_title'],
            'level_up': xp_res['level_up'],
            'streak': profile.streak_count,
            'streak_new_day': streak_res.get('new_day', False),
            'deck_status': deck_status,
        }