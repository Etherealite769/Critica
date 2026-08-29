# backend/api/ai/tests.py
from django.test import TestCase
from .schemas import (
    LogicThreadSessionBatchSchema,
    SnapGapSessionBatchSchema,
    TapCluesSessionBatchSchema,
    FactScannerSessionBatchSchema,
)
from .validators import (
    validate_logic_thread_exercise,
    validate_snap_gap_exercise,
    validate_tap_clues_exercise,
    validate_fact_scanner_exercise,
    calculate_question_hash,
    compute_jaccard_similarity,
    check_novelty_against_history,
    check_intra_session_diversity,
)
from .prompt_builder import (
    build_system_instruction,
    build_generation_prompt,
    build_socratic_hint_prompt,
    select_novel_domains,
    EDUCATIONAL_DOMAINS,
)
from .fallback_pool import get_fallback_batch
from .session_service import SessionService


class GeminiAIIntegrationTests(TestCase):

    def test_logic_thread_validation(self):
        valid_ex = {
            "exercise_id": "t1",
            "topic_title": "Photosynthesis",
            "reading_passage": "Sunlight reaches leaf. Energy is stored.",
            "paragraph_blocks": [
                {"block_id": "p1", "text": "Sunlight reaches leaf.", "order": 1},
                {"block_id": "p2", "text": "Energy is stored.", "order": 2}
            ],
            "correct_sequence": ["p1", "p2"],
            "structural_explanations": {"p2__p1": "p1 must precede p2"},
            "scaffold_hints": [
                {"tier": 1, "hint_text": "Hint 1"},
                {"tier": 2, "hint_text": "Hint 2"},
                {"tier": 3, "hint_text": "Hint 3"}
            ]
        }
        is_valid, msg = validate_logic_thread_exercise(valid_ex)
        self.assertTrue(is_valid, msg)

        # Invalid sequence
        invalid_ex = dict(valid_ex)
        invalid_ex['correct_sequence'] = ['p1', 'p3']
        is_valid, _ = validate_logic_thread_exercise(invalid_ex)
        self.assertFalse(is_valid)

    def test_snap_gap_validation(self):
        valid_ex = {
            "exercise_id": "sg1",
            "topic_title": "Energy",
            "reading_passage": "Solar is clean. However it is intermittent.",
            "sentence_pairs": [
                {"pair_id": "pair_1", "sentence_a": "Solar is clean.", "sentence_b": "it is intermittent."}
            ],
            "transition_tile_dock": ["However", "Therefore", "Furthermore"],
            "correct_tile_map": {"pair_1": "However"},
            "tile_error_explanations": {"pair_1__Therefore": "Wrong relation"},
            "scaffold_hints": [
                {"tier": 1, "hint_text": "Hint 1"},
                {"tier": 2, "hint_text": "Hint 2"},
                {"tier": 3, "hint_text": "Hint 3"}
            ]
        }
        is_valid, msg = validate_snap_gap_exercise(valid_ex)
        self.assertTrue(is_valid, msg)

    def test_tap_clues_validation(self):
        valid_ex = {
            "exercise_id": "tc1",
            "topic_title": "Vocabulary",
            "reading_passage": "The ancient archaic artifact was preserved.",
            "locked_words": [
                {
                    "word_id": "w1",
                    "word": "archaic",
                    "position_index": 2,
                    "correct_clue_ids": ["ancient"],
                    "definition": "Very old",
                    "contextual_usage": "Describes artifact age",
                    "translation": "ancient"
                }
            ],
            "scaffold_hints": [
                {"tier": 1, "hint_text": "Hint 1"},
                {"tier": 2, "hint_text": "Hint 2"},
                {"tier": 3, "hint_text": "Hint 3"}
            ]
        }
        is_valid, msg = validate_tap_clues_exercise(valid_ex)
        self.assertTrue(is_valid, msg)

    def test_fact_scanner_validation(self):
        valid_ex = {
            "exercise_id": "fs1",
            "topic_title": "CRAAP Currency",
            "craap_criterion": "CURRENCY",
            "reading_passage": "Recent 2024 reports confirm progress. A 1980 report says otherwise. New studies support 2024 data.",
            "article_sentences": [
                {"sentence_id": "s1", "text": "Recent 2024 reports confirm progress.", "is_flawed": False, "flaw_reason": ""},
                {"sentence_id": "s2", "text": "A 1980 report says otherwise.", "is_flawed": True, "flaw_reason": "Outdated 1980 source used for modern trend"},
                {"sentence_id": "s3", "text": "New studies support 2024 data.", "is_flawed": False, "flaw_reason": ""}
            ],
            "sentence_explanations": {"s2": "Outdated"},
            "scaffold_hints": [
                {"tier": 1, "hint_text": "Hint 1"},
                {"tier": 2, "hint_text": "Hint 2"},
                {"tier": 3, "hint_text": "Hint 3"}
            ]
        }
        is_valid, msg = validate_fact_scanner_exercise(valid_ex)
        self.assertTrue(is_valid, msg)

    def test_question_hashing_and_uniqueness(self):
        ex1 = {"reading_passage": "Plants require sunlight to produce chemical energy.", "paragraph_blocks": []}
        ex2 = {"reading_passage": "Plants require sunlight to produce chemical energy.", "paragraph_blocks": []}
        ex3 = {"reading_passage": "Deep ocean currents regulate planetary temperature.", "paragraph_blocks": []}

        h1 = calculate_question_hash('logic_thread', ex1)
        h2 = calculate_question_hash('logic_thread', ex2)
        h3 = calculate_question_hash('logic_thread', ex3)

        self.assertEqual(h1, h2)
        self.assertNotEqual(h1, h3)

    def test_novelty_and_jaccard_filters(self):
        past_passages = [
            "Photosynthesis is the process by which plants turn sunlight into energy."
        ]
        past_hashes = {"some_old_hash"}

        # Duplicate hash
        ex_dup_hash = {"reading_passage": "Completely new text."}
        h_dup = calculate_question_hash('logic_thread', ex_dup_hash)
        past_hashes.add(h_dup)
        is_novel, reason = check_novelty_against_history('logic_thread', ex_dup_hash, past_hashes, past_passages)
        self.assertFalse(is_novel)

        # High similarity rephrased passage
        ex_rephrased = {"reading_passage": "Photosynthesis is the process by which green plants convert sunlight into chemical energy."}
        is_novel, reason = check_novelty_against_history('logic_thread', ex_rephrased, {"other_hash"}, past_passages)
        self.assertFalse(is_novel)

        # Genuinely novel passage
        ex_novel = {"reading_passage": "Deep subterranean caverns harbor unique troglobitic organisms adapted to perpetual darkness."}
        is_novel, reason = check_novelty_against_history('logic_thread', ex_novel, {"other_hash"}, past_passages)
        self.assertTrue(is_novel)

    def test_intra_session_diversity(self):
        diverse_exercises = [
            {"reading_passage": "Deep ocean currents circulate warm equatorial waters."},
            {"reading_passage": "Ancient Roman concrete utilized volcanic ash for structural resilience."},
            {"reading_passage": "Quantum computing harnesses superposition for exponential calculation speed."},
        ]
        is_diverse, msg = check_intra_session_diversity(diverse_exercises)
        self.assertTrue(is_diverse, msg)

    def test_domain_rotation(self):
        past_topics = ["Marine Biology Expedition", "Space Exploration Missions"]
        selected = select_novel_domains(past_topics, 3)
        self.assertEqual(len(selected), 3)
        self.assertTrue(len(EDUCATIONAL_DOMAINS) >= 30)

    def test_fallback_pool_generation(self):
        for mod in ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']:
            for diff in [1, 2, 3]:
                batch = get_fallback_batch(mod, diff, count=5)
                self.assertEqual(len(batch), 5)
                self.assertTrue(batch[0].get('topic_title'))

    def test_session_service_lifecycle(self):
        session = SessionService.start_or_get_session(
            student_id="test_student_unit",
            module="logic_thread",
            node_id="log_node_01",
            force_fresh=True
        )
        self.assertTrue(session['session_id'].startswith('sess_'))
        self.assertEqual(session['total_exercises'], 5)

        # Test step evaluation
        eval_res = SessionService.evaluate_exercise_submission(
            session_id=session['session_id'],
            exercise_index=0,
            submission_payload={"sequence": session['exercises'][0]['correct_sequence']}
        )
        self.assertEqual(eval_res['result'], 'correct')

        # Test feedback
        fb = SessionService.get_exercise_feedback(
            session_id=session['session_id'],
            exercise_index=0,
            feedback_query={"tier": 1}
        )
        self.assertTrue(fb['hint'])

        # Test live socratic hint fallback
        socratic = SessionService.get_live_socratic_hint(
            session_id=session['session_id'],
            exercise_index=0,
            submission_payload={"sequence": ["p2", "p1"]},
            error_count=2
        )
        self.assertTrue(socratic.get('socratic_hint'))

    def test_retake_guarantees_different_questions(self):
        student_id = "test_student_retake_unique"
        node_id = "snp_node_01"

        # First take
        session1 = SessionService.start_or_get_session(
            student_id=student_id,
            module="snap_gap",
            node_id=node_id,
            force_fresh=True
        )
        passages_take1 = [ex.get('reading_passage') for ex in session1['exercises']]

        # Complete or start second take with fresh
        session2 = SessionService.start_or_get_session(
            student_id=student_id,
            module="snap_gap",
            node_id=node_id,
            force_fresh=True
        )
        passages_take2 = [ex.get('reading_passage') for ex in session2['exercises']]

        # Verify that take 2 contains questions not in take 1
        self.assertNotEqual(passages_take1[0], passages_take2[0])
        self.assertNotEqual(session1['session_id'], session2['session_id'])
