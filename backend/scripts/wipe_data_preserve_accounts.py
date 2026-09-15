import os
import sys
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from api.models import User
from api.progression.mongo_models import StudentProfileDocument
from api.lexical.mongo_models import LexicalReviewDocument
from api.ai.mongo_models import StudentQuestionHistoryDocument, GeneratedSessionDocument
from api.scaffold.models import TelemetryLog

def wipe_data_preserve_accounts():
    print("=" * 60)
    print("CRITICA DATA WIPEOUT (PRESERVING USER ACCOUNTS)")
    print("=" * 60)

    # 1. Accounts Verification
    user_count = User.objects.count()
    users = list(User.objects.all())
    print(f"[*] Found {user_count} user account(s) in MongoDB.")
    for u in users:
        print(f"    - ID: {u.id} | Email: {u.email} | Name: {u.first_name} {u.last_name}")

    if user_count == 0:
        print("[!] No user accounts found in MongoDB.")

    # 2. Wipe Lexical Review Deck
    lex_count = LexicalReviewDocument.objects.count()
    LexicalReviewDocument.objects.delete()
    print(f"[*] Wiped {lex_count} card(s) from lexical_review_deck.")

    # 3. Wipe AI Question History & Sessions
    ai_hist_count = StudentQuestionHistoryDocument.objects.count()
    StudentQuestionHistoryDocument.objects.delete()
    print(f"[*] Wiped {ai_hist_count} record(s) from student_question_history.")

    ai_sess_count = GeneratedSessionDocument.objects.count()
    GeneratedSessionDocument.objects.delete()
    print(f"[*] Wiped {ai_sess_count} session(s) from generated_question_sessions.")

    # 4. Wipe SQLite Telemetry Logs
    try:
        telem_count = TelemetryLog.objects.count()
        TelemetryLog.objects.all().delete()
        print(f"[*] Wiped {telem_count} log(s) from SQLite telemetry_logs.")
    except Exception as e:
        print(f"[!] Warning: Could not clear telemetry_logs: {e}")

    # 5. Reset Student Profiles to Default Starter State
    prof_count = StudentProfileDocument.objects.count()
    DEFAULT_UNLOCKED = ['log_node_01', 'snp_node_01', 'tap_node_01', 'fac_node_01']
    for p in StudentProfileDocument.objects.all():
        p.unlocked_nodes = list(DEFAULT_UNLOCKED)
        p.completed_nodes = []
        p.streak_count = 0
        if hasattr(p, 'total_xp'):
            p.total_xp = 0
        if hasattr(p, 'current_level'):
            p.current_level = 1
        p.onboarding_completed = False
        p.save()
    print(f"[*] Reset {prof_count} student profile(s) to default starter milestones.")

    # 6. Reset User Progression Fields (streak, total_xp, skill_node_progress)
    for u in users:
        u.streak = 0
        u.total_xp = 0
        u.skill_node_progress = []
        u.save()
    print(f"[*] Reset progression fields on {len(users)} user document(s).")

    # 7. Post-Wipe Verification
    post_user_count = User.objects.count()
    assert post_user_count == user_count, f"ERROR: User count changed from {user_count} to {post_user_count}!"

    print("=" * 60)
    print("SUCCESS: Data wipeout complete. All user accounts remain safely preserved.")
    print(f"Preserved User Count: {post_user_count}")
    print("=" * 60)

if __name__ == '__main__':
    wipe_data_preserve_accounts()
