import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.scaffold.models import TelemetryLog
from api.scaffold.mongo_models import TelemetryLogDocument

def sync_telemetry():
    sqlite_logs = TelemetryLog.objects.all().order_by('timestamp')
    print(f"Found {sqlite_logs.count()} SQLite telemetry log(s).")
    
    migrated = 0
    for log in sqlite_logs:
        # Check if already exists in Mongo
        exists = TelemetryLogDocument.objects(
            student_id=log.student_id,
            node_id=log.node_id,
            timestamp=log.timestamp,
        ).first()
        
        if not exists:
            doc = TelemetryLogDocument(
                student_id=log.student_id,
                node_id=log.node_id,
                module=log.module,
                word_id=log.word_id,
                clue_word_id=log.clue_word_id,
                is_correct=log.is_correct,
                hint_used=log.hint_used,
                hint_tier=log.hint_tier,
                consecutive_errors=log.consecutive_errors,
                inactivity_trigger=log.inactivity_trigger,
                timestamp=log.timestamp,
            )
            doc.save()
            migrated += 1
            
    print(f"Successfully migrated {migrated} telemetry log(s) to MongoDB Atlas.")
    print(f"Total Telemetry in MongoDB Atlas now: {TelemetryLogDocument.objects.count()}")

if __name__ == '__main__':
    sync_telemetry()
