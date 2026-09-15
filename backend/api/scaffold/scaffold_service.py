from .models import TelemetryLog
from .mongo_models import TelemetryLogDocument
from datetime import datetime, timezone

class ScaffoldEngineService:

    CONSECUTIVE_THRESHOLD  = 3
    INACTIVITY_THRESHOLD_S = 60

    @staticmethod
    def should_trigger(student_id, node_id,
                       inactivity_seconds=0):
        recent_records = []
        try:
            recent_records = list(
                TelemetryLogDocument.objects(
                    student_id=str(student_id),
                    node_id=str(node_id),
                ).order_by('-timestamp')[:3]
            )
        except Exception:
            recent_records = []

        if not recent_records:
            try:
                recent_records = list(
                    TelemetryLog.objects.filter(
                        student_id=str(student_id),
                        node_id=str(node_id),
                    ).order_by('-timestamp')[:3]
                )
            except Exception:
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
    def log_attempt(student_id, node_id, module,
                    is_correct, hint_used=False,
                    hint_tier=0,
                    inactivity_trigger=False,
                    word_id='', clue_word_id=''):
        now = datetime.now(timezone.utc)
        # 1. Primary: Save to MongoDB Atlas collection for global sync
        try:
            doc = TelemetryLogDocument(
                student_id=str(student_id),
                node_id=str(node_id),
                module=str(module),
                is_correct=bool(is_correct),
                hint_used=bool(hint_used),
                hint_tier=int(hint_tier or 0),
                inactivity_trigger=bool(inactivity_trigger),
                word_id=str(word_id or ''),
                clue_word_id=str(clue_word_id or ''),
                timestamp=now,
            )
            doc.save()
        except Exception as e:
            print(f"[Warning] Failed to save telemetry to MongoDB: {e}")

        # 2. Secondary / Local backup: Save to SQLite
        try:
            TelemetryLog.objects.create(
                student_id=str(student_id),
                node_id=str(node_id),
                module=str(module),
                is_correct=bool(is_correct),
                hint_used=bool(hint_used),
                hint_tier=int(hint_tier or 0),
                inactivity_trigger=bool(inactivity_trigger),
                word_id=str(word_id or ''),
                clue_word_id=str(clue_word_id or ''),
            )
        except Exception:
            pass