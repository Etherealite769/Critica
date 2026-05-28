from .models import TelemetryLog

class ScaffoldEngineService:

    CONSECUTIVE_THRESHOLD  = 3
    INACTIVITY_THRESHOLD_S = 60

    @staticmethod
    def should_trigger(student_id, node_id,
                       inactivity_seconds=0):
        recent = TelemetryLog.objects.filter(
            student_id=student_id,
            node_id=node_id,
        ).order_by('-timestamp')[:3]

        all_wrong = (
            len(recent) >= 3 and
            all(not r.is_correct for r in recent)
        )
        timed_out = (
            inactivity_seconds >=
            ScaffoldEngineService.INACTIVITY_THRESHOLD_S
        )
        return all_wrong or timed_out

    @staticmethod
    def get_hint_tier(student_id):
        from api.progression.mongo_models import (
            StudentProfileDocument)
        profile = StudentProfileDocument.objects(
            student_id=student_id).first()
        completed = (len(profile.completed_nodes)
                     if profile else 0)
        if   completed >= 6: return 1
        elif completed >= 3: return 2
        else:                return 3

    @staticmethod
    def log_attempt(student_id, node_id, module,
                    is_correct, hint_used=False,
                    hint_tier=0,
                    inactivity_trigger=False,
                    word_id='', clue_word_id=''):
        TelemetryLog.objects.create(
            student_id=student_id,
            node_id=node_id,
            module=module,
            is_correct=is_correct,
            hint_used=hint_used,
            hint_tier=hint_tier,
            inactivity_trigger=inactivity_trigger,
            word_id=word_id,
            clue_word_id=clue_word_id,
        )