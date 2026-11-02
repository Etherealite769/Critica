import logging
import uuid
from datetime import datetime, timezone

from .models import TelemetryLog
from .mongo_models import TelemetryLogDocument

logger = logging.getLogger(__name__)

# Telemetry event types
EVENT_CASE = 'case'   # one per exercise submit (evaluate route)
EVENT_STEP = 'step'   # a single tap / tile / scan (log-attempt route)
EVENT_HINT = 'hint'   # a hint / feedback request (feedback route)
SCORED_EVENT_TYPES = (EVENT_CASE, EVENT_STEP)

class ScaffoldEngineService:

    CONSECUTIVE_THRESHOLD  = 3
    INACTIVITY_THRESHOLD_S = 60

    @staticmethod
    def should_trigger(student_id, node_id,
                       inactivity_seconds=0):
        # Hint requests are not wrong answers, so they never count toward the streak
        recent_records = []
        try:
            recent_records = list(
                TelemetryLogDocument.objects(
                    student_id=str(student_id),
                    node_id=str(node_id),
                    event_type__ne=EVENT_HINT,
                ).order_by('-timestamp', '-id')[:3]
            )
        except Exception as e:
            logger.warning("should_trigger: MongoDB telemetry read failed: %s", e)
            recent_records = []

        if not recent_records:
            try:
                recent_records = list(
                    TelemetryLog.objects.filter(
                        student_id=str(student_id),
                        node_id=str(node_id),
                    ).exclude(event_type=EVENT_HINT)
                    .order_by('-timestamp', '-id')[:3]
                )
            except Exception as e:
                logger.warning("should_trigger: SQLite telemetry read failed: %s", e)
                recent_records = []

        all_wrong = (
            len(recent_records) >= 3 and
            all(not r.is_correct for r in recent_records)
        )
        timed_out = (
            inactivity_seconds >=
            ScaffoldEngineService.INACTIVITY_THRESHOLD_S
        )
        return all_wrong or timed_out

    @staticmethod
    def get_hint_tier(student_id, node_id=''):
        from api.progression.mongo_models import (
            StudentProfileDocument)
        from api.progression.services import (
            MODULE_NODES)
        profile = StudentProfileDocument.objects(
            student_id=student_id).first()
        if not profile:
            return 3
        # Determine which module this node belongs to
        module_nodes = []
        for nodes in MODULE_NODES.values():
            if node_id in nodes:
                module_nodes = nodes
                break
        if module_nodes:
            completed = sum(
                1 for n in profile.completed_nodes
                if n in module_nodes)
        else:
            completed = len(profile.completed_nodes)
        total = len(module_nodes) if module_nodes else 12
        if   completed >= total * 0.5: return 1
        elif completed >= total * 0.25: return 2
        else:                           return 3

    @staticmethod
    def _prior_consecutive_errors(student_id, node_id, event_type):
        """Wrong rows of this event type for the student + node, newest first, up to the first correct one.

        Timestamps have millisecond precision, so insertion order (-id) breaks ties.
        """
        def count(rows):
            streak = 0
            for row in rows:
                if row.is_correct:
                    break
                streak += 1
            return streak

        try:
            return count(TelemetryLogDocument.objects(
                student_id=str(student_id),
                node_id=str(node_id),
                event_type=event_type,
            ).order_by('-timestamp', '-id').only('is_correct'))
        except Exception as e:
            logger.warning("consecutive_errors: MongoDB read failed, using SQLite: %s", e)
        try:
            return count(TelemetryLog.objects.filter(
                student_id=str(student_id),
                node_id=str(node_id),
                event_type=event_type,
            ).order_by('-timestamp', '-id').only('is_correct').iterator())
        except Exception as e:
            logger.warning("consecutive_errors: SQLite read failed: %s", e)
            return 0

    @staticmethod
    def log_attempt(student_id, node_id, module,
                    is_correct, event_type='',
                    hint_used=False,
                    hint_tier=0,
                    inactivity_trigger=False,
                    word_id='', clue_word_id=''):
        # One event: the same id and instant go to both stores
        event_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        now = now.replace(microsecond=now.microsecond // 1000 * 1000)   # Mongo keeps milliseconds
        is_correct = bool(is_correct)

        consecutive_errors = 0
        if event_type in SCORED_EVENT_TYPES and not is_correct:
            consecutive_errors = ScaffoldEngineService._prior_consecutive_errors(
                student_id, node_id, event_type) + 1

        fields = dict(
            student_id=str(student_id),
            node_id=str(node_id),
            module=str(module),
            event_type=str(event_type or ''),
            event_id=event_id,
            is_correct=is_correct,
            hint_used=bool(hint_used),
            hint_tier=int(hint_tier or 0),
            consecutive_errors=consecutive_errors,
            inactivity_trigger=bool(inactivity_trigger),
            word_id=str(word_id or ''),
            clue_word_id=str(clue_word_id or ''),
            timestamp=now,
        )

        # 1. Primary: Save to MongoDB Atlas collection for global sync
        try:
            TelemetryLogDocument(**fields).save()
        except Exception as e:
            logger.warning("Failed to save telemetry event %s to MongoDB: %s", event_id, e)

        # 2. Secondary / Local backup: Save to SQLite
        try:
            TelemetryLog.objects.create(**fields)
        except Exception as e:
            logger.warning("Failed to save telemetry event %s to SQLite: %s", event_id, e)

        return event_id
