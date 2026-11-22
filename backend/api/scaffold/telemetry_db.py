# backend/api/scaffold/telemetry_db.py
"""
Makes sure the SQLite telemetry_logs table exists, so the telemetry logger never fails with
"no such table: telemetry_logs" (for example on a fresh deploy where `manage.py migrate` never ran).

The DDL is exactly what Django's migrations create for api.scaffold.models.TelemetryLog
(scaffold 0001_initial + 0002_telemetry_event_type): same columns, types, order and index. It only ever
runs CREATE ... IF NOT EXISTS, so an existing table and its rows are never altered.

When this function has to create the table itself, it also records the two scaffold migrations as applied
(as `migrate` would have), so a later `manage.py migrate` does not try to create the table a second time.
"""
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Union

logger = logging.getLogger(__name__)

TELEMETRY_TABLE = 'telemetry_logs'

_CREATE_TABLE = (
    'CREATE TABLE IF NOT EXISTS "telemetry_logs" ('
    '"id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, '
    '"student_id" varchar(100) NOT NULL, '
    '"node_id" varchar(100) NOT NULL, '
    '"module" varchar(50) NOT NULL, '
    '"word_id" varchar(100) NOT NULL, '
    '"clue_word_id" varchar(100) NOT NULL, '
    '"is_correct" bool NOT NULL, '
    '"hint_used" bool NOT NULL, '
    '"hint_tier" integer NOT NULL, '
    '"consecutive_errors" integer NOT NULL, '
    '"inactivity_trigger" bool NOT NULL, '
    '"event_id" varchar(36) NOT NULL, '
    '"event_type" varchar(10) NOT NULL, '
    '"timestamp" datetime NOT NULL)'
)
_CREATE_INDEX = 'CREATE INDEX IF NOT EXISTS "telemetry_logs_event_id_f954a060" ON "telemetry_logs" ("event_id")'

# Django's own migration-history table, in case the database file is brand new
_CREATE_MIGRATIONS = (
    'CREATE TABLE IF NOT EXISTS "django_migrations" ('
    '"id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, '
    '"app" varchar(255) NOT NULL, '
    '"name" varchar(255) NOT NULL, '
    '"applied" datetime NOT NULL)'
)
_SCAFFOLD_MIGRATIONS = ('0001_initial', '0002_telemetry_event_type')


def telemetry_db_path() -> Path:
    """The configured SQLite file (settings.TELEMETRY_DB_PATH, which is also DATABASES['default']['NAME'])."""
    from django.conf import settings
    return Path(getattr(settings, 'TELEMETRY_DB_PATH', None) or settings.DATABASES['default']['NAME'])


def _ensure(execute, fetchone, ph: str) -> bool:
    """Run the idempotent DDL through `execute`; `ph` is the driver's parameter placeholder."""
    existed = fetchone(f"SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = {ph}", (TELEMETRY_TABLE,))
    execute(_CREATE_TABLE)
    execute(_CREATE_INDEX)
    if not existed:
        execute(_CREATE_MIGRATIONS)
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=' ')
        for name in _SCAFFOLD_MIGRATIONS:
            if not fetchone(f'SELECT 1 FROM "django_migrations" WHERE "app" = {ph} AND "name" = {ph}', ('scaffold', name)):
                execute(f'INSERT INTO "django_migrations" ("app", "name", "applied") VALUES ({ph}, {ph}, {ph})',
                        ('scaffold', name, now))
    return not existed


def ensure_telemetry_table(db_path: Optional[Union[str, Path]] = None) -> bool:
    """
    Idempotently create telemetry_logs (and its index). Returns True if the table had to be created.

    With no `db_path` it works through Django's `default` connection, i.e. exactly the database the ORM (and
    therefore the telemetry logger) writes to. With a `db_path` it opens that SQLite file directly, creating the
    file and its parent folder if needed.
    """
    if db_path is None:
        from django.db import connections, transaction
        conn = connections['default']
        if conn.vendor != 'sqlite':
            return False
        with transaction.atomic(using='default'), conn.cursor() as cur:
            created = _ensure(lambda sql, params=(): cur.execute(sql, params),
                              lambda sql, params=(): (cur.execute(sql, params), cur.fetchone())[1], '%s')
        where = conn.settings_dict.get('NAME')
    else:
        path = Path(db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = sqlite3.connect(str(path), timeout=30)
        try:
            with raw:
                created = _ensure(lambda sql, params=(): raw.execute(sql, params),
                                  lambda sql, params=(): raw.execute(sql, params).fetchone(), '?')
        finally:
            raw.close()
        where = path
    if created:
        logger.info("Created SQLite table %s in %s", TELEMETRY_TABLE, where)
    return created
