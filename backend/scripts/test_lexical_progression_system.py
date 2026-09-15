import os
import sys
import django
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.progression.mongo_models import StudentProfileDocument
from api.progression.services import ProgressionManagementService
from api.lexical.services import SpacedRepetitionService
from api.lexical.mongo_models import LexicalReviewDocument

def test_full_system():
    print("--- 1. Testing Profile & EXP Thresholds ---")
    student_id = "test_verification_student_42"
    
    # Clean up any past test artifact
    StudentProfileDocument.objects(student_id=student_id).delete()
    LexicalReviewDocument.objects(student_id=student_id).delete()
    
    profile = ProgressionManagementService.get_or_create_profile(student_id=student_id, username="TestAgent")
    print(f"Initial profile: XP={profile.total_xp}, Level={profile.current_level}, Streak={profile.streak_count}")
    assert profile.total_xp == 0
    assert profile.current_level == 1
    assert profile.streak_count == 0
    
    # Check streak check-in
    res = ProgressionManagementService.check_in_streak(student_id)
    print(f"Streak check-in: streak={res['streak']}, xp_awarded={res['xp_awarded']}, total_xp={res['total_xp']}")
    assert res['streak'] == 1
    assert res['xp_awarded'] == 30  # min(50, 25 + 1 * 5) = 30 XP
    assert res['total_xp'] == 30
    assert res['level'] == 1
    
    # Check node mastery award (+100 base)
    update_res = ProgressionManagementService.update_progression(
        student_id=student_id,
        node_id='log_node_01',
        hints_used=0
    )
    print(f"Node mastery: xp_awarded={update_res.get('xp_awarded')}, total_xp={update_res.get('total_xp')}")
    assert update_res.get('xp_awarded') == 125 # 100 base + 25 hint bonus
    assert update_res.get('total_xp') == 155 # 30 + 125 = 155
    
    print("\n--- 2. Testing Level 1 Bound (0 - 799 XP) ---")
    rank_799 = ProgressionManagementService.calculate_rank_and_level(799)
    print(f"XP 799 -> Level {rank_799['level']} ({rank_799['rank_title']}), progress: {rank_799['level_progress_pct']}%")
    assert rank_799['level'] == 1
    
    rank_800 = ProgressionManagementService.calculate_rank_and_level(800)
    print(f"XP 800 -> Level {rank_800['level']} ({rank_800['rank_title']}), progress: {rank_800['level_progress_pct']}%")
    assert rank_800['level'] == 2
    
    print("\n--- 3. Testing Lexical Realtime & Spaced Repetition ---")
    # Schedule a new word
    card = SpacedRepetitionService.schedule_word(
        student_id=student_id,
        word_data={
            "word": "Corroborate",
            "definition": "To confirm or give support to a statement or theory",
            "contextual_usage": "The detective found footage that corroborated the alibi."
        }
    )
    print(f"Card scheduled: word={card.word}, next_review={card.next_review_date}")
    # Verify card is immediately available for review
    assert card.next_review_date <= datetime.now(timezone.utc)
    
    status = SpacedRepetitionService.get_deck_status(student_id)
    print(f"Deck status: total={status['total_count']}, due_count={status['due_count']}, reviewed_today={status['reviewed_today_count']}")
    assert status['total_count'] == 1
    assert status['due_count'] == 1
    
    # Review word
    review_res = SpacedRepetitionService.record_review(student_id, "Corroborate")
    print(f"Review result: word={review_res['word']}, xp_awarded={review_res.get('xp_awarded')}, total_xp={review_res.get('total_xp')}")
    assert review_res['xp_awarded'] >= 10
    
    # Status after review
    status_after = SpacedRepetitionService.get_deck_status(student_id)
    print(f"Status after review: due_count={status_after['due_count']}, reviewed_today={status_after['reviewed_today_count']}")
    assert status_after['reviewed_today_count'] == 1
    assert status_after['due_count'] == 0
    
    # Clean up test artifacts
    StudentProfileDocument.objects(student_id=student_id).delete()
    LexicalReviewDocument.objects(student_id=student_id).delete()
    print("\nAll verification tests passed successfully!")

if __name__ == '__main__':
    test_full_system()
