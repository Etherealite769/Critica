"""
Copies SQLite telemetry rows that are missing from MongoDB. Never deletes or edits anything.

A SQLite row already exists in Mongo when:
  - it has an event_id and Mongo has a row with that event_id, or
  - (older rows without event_id) Mongo has a row with the same student_id, node_id, module
    and is_correct whose timestamp is within 2 seconds.

Usage:
  python scripts/sync_sqlite_telemetry_to_mongo.py            # insert missing rows
  python scripts/sync_sqlite_telemetry_to_mongo.py --dry-run  # only report how many would be inserted
"""
import argparse
import os
import sys
from datetime import timedelta, timezone

import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.scaffold.models import TelemetryLog
from api.scaffold.mongo_models import TelemetryLogDocument

MATCH_WINDOW = timedelta(seconds=2)


def _as_naive_utc(ts):
    """Mongo stores naive UTC datetimes; SQLite may hand back aware ones."""
    if ts is not None and ts.tzinfo is not None:
        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts


def exists_in_mongo(log):
    if log.event_id:
        return TelemetryLogDocument.objects(event_id=log.event_id).first() is not None
    ts = _as_naive_utc(log.timestamp)
    return TelemetryLogDocument.objects(
        student_id=log.student_id,
        node_id=log.node_id,
        module=log.module,
        is_correct=log.is_correct,
        timestamp__gte=ts - MATCH_WINDOW,
        timestamp__lte=ts + MATCH_WINDOW,
    ).first() is not None


def sync_telemetry(dry_run=False):
    sqlite_logs = TelemetryLog.objects.all().order_by('timestamp')
    print(f"Found {sqlite_logs.count()} SQLite telemetry log(s).")

    missing = 0
    for log in sqlite_logs.iterator():
        if exists_in_mongo(log):
            continue
        missing += 1
        if dry_run:
            continue
        TelemetryLogDocument(
            student_id=log.student_id,
            node_id=log.node_id,
            module=log.module,
            word_id=log.word_id,
            clue_word_id=log.clue_word_id,
            event_type=log.event_type,
            event_id=log.event_id,
            is_correct=log.is_correct,
            hint_used=log.hint_used,
            hint_tier=log.hint_tier,
            consecutive_errors=log.consecutive_errors,
            inactivity_trigger=log.inactivity_trigger,
            timestamp=_as_naive_utc(log.timestamp),
        ).save()

    if dry_run:
        print(f"[dry run] {missing} telemetry log(s) would be inserted into MongoDB. Nothing was written.")
    else:
        print(f"Successfully migrated {missing} telemetry log(s) to MongoDB Atlas.")
    print(f"Total Telemetry in MongoDB Atlas now: {TelemetryLogDocument.objects.count()}")
    return missing


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true',
                        help='report how many rows would be inserted without writing anything')
    sync_telemetry(dry_run=parser.parse_args().dry_run)
