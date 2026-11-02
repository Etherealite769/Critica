# backend/api/scaffold/tests.py
# Telemetry accuracy (SDD Module 10). MongoDB is mongomock here: config/settings.py connects
# mongoengine to mongomock whenever the command is `manage.py test`.
import importlib.util
import io
import os
import uuid
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from unittest import mock

from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from api.ai.mongo_models import GeneratedSessionDocument
from api.ai.session_service import SessionService
from api.progression.mongo_models import StudentProfileDocument
from api.scaffold.models import TelemetryLog
from api.scaffold.mongo_models import TelemetryLogDocument
from api.scaffold.scaffold_service import ScaffoldEngineService

STUDENT = 'student-a'
OTHER = 'student-b'


class StubUser:
    """Just enough of a user for IsAuthenticated + request.user.id / email."""
    is_authenticated = True

    def __init__(self, uid):
        self.id = uid
        self.email = f'{uid}@example.com'


class MongoTestCase(TestCase):
    def setUp(self):
        # mongomock persists across tests in the process: start each test clean
        for doc in (TelemetryLogDocument, GeneratedSessionDocument, StudentProfileDocument):
            doc.drop_collection()

    def make_session(self, student_id=STUDENT, module='tap_clues', node_id='tap_node_02', exercises=None):
        sid = f'sess_{uuid.uuid4().hex[:12]}'
        GeneratedSessionDocument(
            session_id=sid, student_id=student_id, module=module, node_id=node_id,
            exercises=exercises if exercises is not None else [{
                'locked_words': [{'word_id': 'w1', 'word': 'meticulous'}],
            }],
        ).save()
        return sid

    def client_for(self, uid=STUDENT):
        client = APIClient()
        client.force_authenticate(user=StubUser(uid))
        return client

    def log(self, is_correct, event_type, node_id='tap_node_02', module='tap_clues', student_id=STUDENT, **kw):
        return ScaffoldEngineService.log_attempt(
            student_id=student_id, node_id=node_id, module=module,
            is_correct=is_correct, event_type=event_type, **kw)


# ── 0. Test isolation ────────────────────────────────────────────────
class TestEnvironmentTests(TestCase):
    def test_mongo_is_mongomock_and_gemini_is_off(self):
        import mongomock
        self.assertIsInstance(TelemetryLogDocument._get_collection().database.client, mongomock.MongoClient)
        self.assertEqual(settings.GEMINI_API_KEY, '')


# ── 1. Event types, one event id / timestamp in both stores, logged errors ──
class LogAttemptTests(MongoTestCase):
    def test_same_event_id_and_timestamp_in_both_stores(self):
        event_id = self.log(True, 'step', word_id='w1', clue_word_id='careful')
        mongo = TelemetryLogDocument.objects.get(event_id=event_id)
        row = TelemetryLog.objects.get(event_id=event_id)
        uuid.UUID(event_id)   # a real UUID string
        self.assertEqual(mongo.event_type, 'step')
        self.assertEqual(row.event_type, 'step')
        mongo_ts = mongo.timestamp.replace(tzinfo=timezone.utc) if mongo.timestamp.tzinfo is None else mongo.timestamp
        self.assertEqual(mongo_ts, row.timestamp)
        self.assertEqual(TelemetryLogDocument.objects.count(), 1)
        self.assertEqual(TelemetryLog.objects.count(), 1)

    def test_each_call_gets_a_new_event_id(self):
        a = self.log(False, 'step')
        b = self.log(False, 'step')
        self.assertNotEqual(a, b)

    def test_defaults_for_rows_without_event_type(self):
        # Legacy callers (api/modules/*/views.py) do not pass event_type
        ScaffoldEngineService.log_attempt(student_id=STUDENT, node_id='log_node_02', module='logic_thread', is_correct=True)
        self.assertEqual(TelemetryLogDocument.objects.first().event_type, '')
        self.assertEqual(TelemetryLog.objects.first().event_type, '')

    def test_mongo_failure_is_logged_and_sqlite_still_written(self):
        with mock.patch.object(TelemetryLogDocument, 'save', side_effect=RuntimeError('atlas down')):
            with self.assertLogs('api.scaffold.scaffold_service', level='WARNING') as logs:
                event_id = self.log(False, 'case')
        self.assertTrue(any('atlas down' in line for line in logs.output))
        self.assertTrue(TelemetryLog.objects.filter(event_id=event_id).exists())

    def test_sqlite_failure_is_logged_and_mongo_still_written(self):
        with mock.patch.object(TelemetryLog.objects, 'create', side_effect=RuntimeError('disk full')):
            with self.assertLogs('api.scaffold.scaffold_service', level='WARNING') as logs:
                event_id = self.log(False, 'case')
        self.assertTrue(any('disk full' in line for line in logs.output))
        self.assertEqual(TelemetryLogDocument.objects(event_id=event_id).count(), 1)


# ── 5. consecutive_errors computed server-side ───────────────────────
class ConsecutiveErrorsTests(MongoTestCase):
    def errors(self, event_id):
        mongo = TelemetryLogDocument.objects.get(event_id=event_id).consecutive_errors
        sqlite = TelemetryLog.objects.get(event_id=event_id).consecutive_errors
        self.assertEqual(mongo, sqlite)
        return mongo

    def test_counts_wrong_streak_and_resets_on_correct(self):
        seq = [(False, 1), (False, 2), (True, 0), (False, 1), (False, 2), (False, 3)]
        for is_correct, expected in seq:
            self.assertEqual(self.errors(self.log(is_correct, 'step')), expected)

    def test_hint_rows_are_ignored(self):
        self.log(False, 'step')
        self.log(False, 'hint', hint_used=True, hint_tier=1)
        self.log(False, 'hint', hint_used=True, hint_tier=2)
        self.assertEqual(self.errors(self.log(False, 'step')), 2)
        # hint rows themselves never carry a streak
        self.assertEqual(self.errors(self.log(False, 'hint', hint_used=True)), 0)

    def test_streak_is_per_event_type_node_and_student(self):
        self.log(False, 'step')
        self.log(False, 'step')
        self.assertEqual(self.errors(self.log(False, 'case')), 1)                       # other event type
        self.assertEqual(self.errors(self.log(False, 'step', node_id='tap_node_03')), 1)  # other node
        self.assertEqual(self.errors(self.log(False, 'step', student_id=OTHER)), 1)      # other student
        self.assertEqual(self.errors(self.log(False, 'step')), 3)


# ── 2. Feedback route: hints for every tier ──────────────────────────
class FeedbackViewTests(MongoTestCase):
    def post(self, sid, body, uid=STUDENT):
        return self.client_for(uid).post(f'/api/ai/session/{sid}/feedback/0/', body, format='json')

    def test_tier_one_is_a_hint(self):
        sid = self.make_session()
        self.assertEqual(self.post(sid, {'tier': 1}).status_code, 200)
        doc = TelemetryLogDocument.objects.get()
        self.assertEqual((doc.event_type, doc.hint_used, doc.hint_tier, doc.is_correct), ('hint', True, 1, False))
        self.assertEqual((doc.node_id, doc.module), ('tap_node_02', 'tap_clues'))

    def test_tier_is_cast_safely(self):
        sid = self.make_session()
        for raw, expected in (('3', 3), ('abc', 1), (None, 1), (2, 2)):
            TelemetryLogDocument.drop_collection()
            self.assertEqual(self.post(sid, {'tier': raw}).status_code, 200)
            self.assertEqual(TelemetryLogDocument.objects.get().hint_tier, expected, raw)

    def test_other_students_session_is_forbidden(self):
        sid = self.make_session(student_id=OTHER)
        self.assertEqual(self.post(sid, {'tier': 2}).status_code, 403)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)

    def test_unknown_session_is_404(self):
        self.assertEqual(self.post('sess_missing', {'tier': 2}).status_code, 404)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)


# ── 3. Evaluate route: case events, node/module from the session, ownership ──
class EvaluateViewTests(MongoTestCase):
    def post(self, sid, body, uid=STUDENT):
        return self.client_for(uid).post(f'/api/ai/session/{sid}/evaluate/0/', body, format='json')

    def test_logs_case_with_session_node_and_module(self):
        sid = self.make_session()
        # The client claims another node/module: they must be ignored
        res = self.post(sid, {'unlocked_word_ids': ['w1'], 'node_id': 'fac_node_09', 'module': 'fact_scanner'})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['is_correct'])
        doc = TelemetryLogDocument.objects.get()
        self.assertEqual((doc.event_type, doc.node_id, doc.module, doc.is_correct), ('case', 'tap_node_02', 'tap_clues', True))

    def test_wrong_submission_logs_wrong_case(self):
        sid = self.make_session()
        self.assertEqual(self.post(sid, {'unlocked_word_ids': []}).status_code, 200)
        doc = TelemetryLogDocument.objects.get()
        self.assertEqual((doc.event_type, doc.is_correct, doc.consecutive_errors), ('case', False, 1))

    def test_other_students_session_is_forbidden(self):
        sid = self.make_session(student_id=OTHER)
        self.assertEqual(self.post(sid, {'unlocked_word_ids': ['w1']}).status_code, 403)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)
        self.assertEqual(TelemetryLog.objects.count(), 0)

    def test_unknown_session_is_404(self):
        self.assertEqual(self.post('sess_missing', {}).status_code, 404)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)


# ── 4. log-attempt route: step events, 404 without logging, default wrong ──
class LogAttemptViewTests(MongoTestCase):
    def post(self, sid, body, uid=STUDENT):
        return self.client_for(uid).post(f'/api/ai/session/{sid}/log-attempt/', body, format='json')

    def test_logs_step(self):
        sid = self.make_session(module='snap_gap', node_id='snp_node_02')
        self.assertEqual(self.post(sid, {'is_correct': True, 'word_id': 'pr1', 'clue_word': 'However'}).status_code, 200)
        doc = TelemetryLogDocument.objects.get()
        self.assertEqual((doc.event_type, doc.is_correct, doc.node_id, doc.module), ('step', True, 'snp_node_02', 'snap_gap'))

    def test_is_correct_defaults_to_false(self):
        sid = self.make_session()
        self.assertEqual(self.post(sid, {}).status_code, 200)
        self.assertFalse(TelemetryLogDocument.objects.get().is_correct)

    def test_string_false_is_false(self):
        sid = self.make_session()
        self.post(sid, {'is_correct': 'false'})
        self.assertFalse(TelemetryLogDocument.objects.get().is_correct)

    def test_unknown_session_is_404_and_logs_nothing(self):
        self.assertEqual(self.post('sess_missing', {'is_correct': False}).status_code, 404)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)
        self.assertEqual(TelemetryLog.objects.count(), 0)

    def test_other_students_session_is_forbidden(self):
        sid = self.make_session(student_id=OTHER)
        self.assertEqual(self.post(sid, {'is_correct': False}).status_code, 403)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)


# ── 6. Snap-in Gap tiles compare like the frontend ───────────────────
class SnapGapEvaluationTests(MongoTestCase):
    def evaluate(self, board):
        sid = self.make_session(module='snap_gap', node_id='snp_node_02', exercises=[
            {'correct_tile_map': {'p1': 'However', 'p2': ' For example '}},
        ])
        return SessionService.evaluate_exercise_submission(sid, 0, {'board_state': board})

    def test_case_and_whitespace_insensitive(self):
        res = self.evaluate({'p1': '  however ', 'p2': 'FOR EXAMPLE'})
        self.assertTrue(res['is_correct'])
        self.assertEqual(res['incorrect_pairs'], [])

    def test_wrong_tile_still_wrong(self):
        res = self.evaluate({'p1': 'Therefore', 'p2': 'for example'})
        self.assertFalse(res['is_correct'])
        self.assertEqual(res['incorrect_pairs'], ['p1'])


# ── 8. StudentMetricsView ────────────────────────────────────────────
class StudentMetricsTests(MongoTestCase):
    def metrics(self, uid=STUDENT):
        res = self.client_for(uid).get('/api/progression/metrics/')
        self.assertEqual(res.status_code, 200)
        return res.json()

    def insert_legacy(self, is_correct, hint_used=False, module='logic_thread', node_id='log_node_02', student_id=STUDENT):
        # An old row as stored before this change: no event_type / event_id fields at all
        TelemetryLogDocument._get_collection().insert_one({
            'student_id': student_id, 'node_id': node_id, 'module': module,
            'word_id': '', 'clue_word_id': '', 'is_correct': is_correct, 'hint_used': hint_used,
            'hint_tier': 2 if hint_used else 0, 'consecutive_errors': 0, 'inactivity_trigger': False,
            'timestamp': datetime.utcnow(),
        })

    def test_no_telemetry_returns_nulls_not_100(self):
        data = self.metrics()
        self.assertIsNone(data['overall_accuracy'])
        self.assertIsNone(data['hint_independence'])
        self.assertEqual(data['metrics_source'], 'none')
        self.assertEqual((data['case_count'], data['hints_used_count']), (0, 0))
        self.assertTrue(all(m['accuracy'] is None for m in data['module_stats'].values()))
        self.assertEqual(data['overall_grade']['title'], 'NO DATA YET')

    def test_no_telemetry_with_completed_nodes_still_null(self):
        StudentProfileDocument(student_id=STUDENT, username='a', completed_nodes=['log_node_01']).save()
        data = self.metrics()
        self.assertIsNone(data['overall_accuracy'])
        self.assertIsNone(data['hint_independence'])

    def test_accuracy_uses_case_rows_only(self):
        self.log(True, 'case')
        self.log(False, 'case')
        self.log(True, 'case')
        self.log(True, 'case')
        for _ in range(5):
            self.log(False, 'step')            # steps never count toward accuracy
        self.log(False, 'hint', hint_used=True, hint_tier=1)
        data = self.metrics()
        self.assertEqual(data['metrics_source'], 'events')
        self.assertEqual(data['overall_accuracy'], 75)
        self.assertEqual((data['case_count'], data['hints_used_count']), (4, 1))
        self.assertEqual(data['hint_independence'], 75)          # 100 * (1 - 1/4)
        self.assertEqual(data['module_stats']['tap_clues']['accuracy'], 75)
        self.assertEqual(data['module_stats']['tap_clues']['attempts'], 4)
        self.assertIsNone(data['module_stats']['snap_gap']['accuracy'])

    def test_hint_independence_is_clamped(self):
        self.log(True, 'case')
        for _ in range(3):
            self.log(False, 'hint', hint_used=True)
        self.assertEqual(self.metrics()['hint_independence'], 0)

    def test_hints_without_cases_give_null(self):
        self.log(False, 'hint', hint_used=True)
        data = self.metrics()
        self.assertEqual(data['metrics_source'], 'events')
        self.assertIsNone(data['overall_accuracy'])
        self.assertIsNone(data['hint_independence'])
        self.assertEqual(data['hints_used_count'], 1)

    def test_legacy_rows_use_legacy_rule(self):
        self.insert_legacy(True)
        self.insert_legacy(False, hint_used=True)
        self.insert_legacy(True)
        self.insert_legacy(True)
        data = self.metrics()
        self.assertEqual(data['metrics_source'], 'legacy')
        self.assertEqual(data['overall_accuracy'], 75)
        self.assertEqual((data['case_count'], data['hints_used_count']), (4, 1))
        self.assertEqual(data['hint_independence'], 75)
        self.assertEqual(data['module_stats']['logic_thread']['accuracy'], 75)

    def test_legacy_rows_ignored_once_event_rows_exist(self):
        for _ in range(4):
            self.insert_legacy(False)
        self.log(True, 'case')
        data = self.metrics()
        self.assertEqual(data['metrics_source'], 'events')
        self.assertEqual(data['overall_accuracy'], 100)
        self.assertEqual(data['case_count'], 1)

    def test_old_rows_still_load_and_recent_activity_has_event_type(self):
        self.insert_legacy(True)
        self.log(False, 'hint', hint_used=True, hint_tier=1)
        data = self.metrics()
        types = sorted(item['event_type'] for item in data['recent_activity'])
        self.assertEqual(types, ['', 'hint'])

    def test_other_students_rows_are_not_counted(self):
        self.log(False, 'case', student_id=OTHER)
        self.assertEqual(self.metrics()['metrics_source'], 'none')


# ── should_trigger ignores hint rows ─────────────────────────────────
class ShouldTriggerTests(MongoTestCase):
    def test_hints_do_not_trigger_escalation(self):
        for _ in range(3):
            self.log(False, 'hint', hint_used=True)
        self.assertFalse(ScaffoldEngineService.should_trigger(STUDENT, 'tap_node_02'))

    def test_three_wrong_steps_trigger(self):
        for _ in range(3):
            self.log(False, 'step')
        self.log(False, 'hint', hint_used=True)
        self.assertTrue(ScaffoldEngineService.should_trigger(STUDENT, 'tap_node_02'))


# ── 9. Sync script ───────────────────────────────────────────────────
def load_sync_script():
    path = os.path.join(settings.BASE_DIR, 'scripts', 'sync_sqlite_telemetry_to_mongo.py')
    spec = importlib.util.spec_from_file_location('sync_sqlite_telemetry_to_mongo', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SyncScriptTests(MongoTestCase):
    def setUp(self):
        super().setUp()
        self.sync = load_sync_script()
        self.now = datetime.now(timezone.utc).replace(microsecond=0)

    def sqlite_row(self, **kw):
        fields = dict(student_id=STUDENT, node_id='tap_node_02', module='tap_clues', is_correct=False, timestamp=self.now)
        fields.update(kw)
        return TelemetryLog.objects.create(**fields)

    def mongo_row(self, **kw):
        fields = dict(student_id=STUDENT, node_id='tap_node_02', module='tap_clues', is_correct=False,
                      timestamp=self.now.replace(tzinfo=None))
        fields.update(kw)
        return TelemetryLogDocument(**fields).save()

    def run_sync(self, dry_run):
        with redirect_stdout(io.StringIO()) as out:
            missing = self.sync.sync_telemetry(dry_run=dry_run)
        return missing, out.getvalue()

    def test_matches_on_event_id(self):
        self.sqlite_row(event_id='e-1', event_type='step')
        self.mongo_row(event_id='e-1', event_type='step', timestamp=(self.now - timedelta(hours=1)).replace(tzinfo=None))
        self.sqlite_row(event_id='e-2', event_type='step')   # not in Mongo
        missing, _ = self.run_sync(dry_run=False)
        self.assertEqual(missing, 1)
        self.assertEqual(TelemetryLogDocument.objects(event_id='e-2').count(), 1)
        self.assertEqual(TelemetryLogDocument.objects.count(), 2)

    def test_legacy_rows_match_within_two_seconds(self):
        self.sqlite_row(is_correct=True)
        self.mongo_row(is_correct=True, timestamp=(self.now + timedelta(milliseconds=1500)).replace(tzinfo=None))
        self.sqlite_row(is_correct=False, timestamp=self.now + timedelta(minutes=5))
        self.mongo_row(is_correct=False, timestamp=(self.now + timedelta(minutes=5, seconds=3)).replace(tzinfo=None))
        missing, _ = self.run_sync(dry_run=False)
        self.assertEqual(missing, 1)            # only the 3-second-apart row is new
        self.assertEqual(TelemetryLogDocument.objects.count(), 3)

    def test_legacy_match_requires_same_outcome(self):
        self.sqlite_row(is_correct=True)
        self.mongo_row(is_correct=False)
        missing, _ = self.run_sync(dry_run=True)
        self.assertEqual(missing, 1)

    def test_dry_run_writes_nothing(self):
        self.sqlite_row(event_id='e-3', event_type='case')
        self.sqlite_row(event_id='e-4', event_type='case')
        missing, out = self.run_sync(dry_run=True)
        self.assertEqual(missing, 2)
        self.assertIn('would be inserted', out)
        self.assertEqual(TelemetryLogDocument.objects.count(), 0)

    def test_never_deletes_mongo_only_rows(self):
        self.mongo_row(event_id='mongo-only', event_type='case')
        self.run_sync(dry_run=False)
        self.assertEqual(TelemetryLogDocument.objects(event_id='mongo-only').count(), 1)

    def test_copies_event_fields(self):
        self.sqlite_row(event_id='e-5', event_type='hint', hint_used=True, hint_tier=2, consecutive_errors=0)
        self.run_sync(dry_run=False)
        doc = TelemetryLogDocument.objects.get(event_id='e-5')
        self.assertEqual((doc.event_type, doc.hint_used, doc.hint_tier), ('hint', True, 2))
