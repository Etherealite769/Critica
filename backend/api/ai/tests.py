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

    def test_node_reset_purges_generated_session(self):
        from api.progression.services import ProgressionManagementService
        from .mongo_models import GeneratedSessionDocument

        student_id = "test_student_reset_flow"
        node_id = "log_node_01"

        # 1. Start a session and progress to index 2
        session = SessionService.start_or_get_session(
            student_id=student_id,
            module="logic_thread",
            node_id=node_id,
            force_fresh=True
        )
        SessionService.update_session_progress(session['session_id'], 2)

        # Verify it has current_index = 2 in MongoDB
        doc = GeneratedSessionDocument.objects(session_id=session['session_id']).first()
        self.assertIsNotNone(doc)
        self.assertEqual(doc.current_index, 2)

        # 2. Reset the node
        ProgressionManagementService.reset_node(student_id, node_id)

        # Verify the GeneratedSessionDocument was purged
        doc_after = GeneratedSessionDocument.objects(student_id=student_id, node_id=node_id).first()
        self.assertIsNone(doc_after)

        # 3. Next session call starts fresh at index 0
        new_session = SessionService.start_or_get_session(
            student_id=student_id,
            module="logic_thread",
            node_id=node_id,
            force_fresh=False
        )
        self.assertEqual(new_session['current_index'], 0)
        self.assertNotEqual(new_session['session_id'], session['session_id'])

    def test_anti_repetition_dock_and_sentence_shuffling(self):
        # Verify snap_gap dock tiles are shuffled and not strictly pair 1 -> index 0 across batch
        exercises = get_fallback_batch("snap_gap", difficulty=1, count=5)
        pair1_indices = []
        for ex in exercises:
            correct_tile = ex['correct_tile_map'].get('pair_1')
            dock = ex['transition_tile_dock']
            if correct_tile in dock:
                pair1_indices.append(dock.index(correct_tile))

        # Over 5 exercises, the correct tile for pair 1 should not always be at index 0
        # (With random shuffling, having all 5 at index 0 is (1/6)^5 = 0.00012)
        self.assertFalse(all(idx == 0 for idx in pair1_indices), "Pair 1 tile should not always be at index 0")

        # Verify fact_scanner flawed sentences vary across positions
        fac_exercises = get_fallback_batch("fact_scanner", difficulty=1, count=5)
        flawed_ids = []
        for ex in fac_exercises:
            flawed = [s['sentence_id'] for s in ex['article_sentences'] if s['is_flawed']]
            flawed_ids.extend(flawed)

        # Flawed sentences should not all be s3
        self.assertFalse(all(fid == 's3' for fid in flawed_ids), "Flawed sentence should not always be s3")


class Grade11ContentTests(TestCase):
    """Grade 11 tier calibration across the Gemini prompts, validators, fallback bank and session flow."""

    MODULES = ['logic_thread', 'snap_gap', 'tap_clues', 'fact_scanner']
    NODES = {
        'logic_thread': ['log_node_01', 'log_node_05', 'log_node_09'],
        'snap_gap': ['snp_node_04', 'snp_node_08', 'snp_node_12'],
        'tap_clues': ['tap_node_07', 'tap_node_02', 'tap_node_06'],
        'fact_scanner': ['fac_node_01', 'fac_node_05', 'fac_node_09'],
    }

    def test_prompts_carry_grade11_standard_and_tier_rules(self):
        from .prompt_builder import MODULE_TIER_RULES
        self.assertIn('Grade 11', build_system_instruction())
        for mod in self.MODULES:
            for diff, label in [(1, 'BASICS'), (2, 'INTERMEDIATE'), (3, 'ADVANCED')]:
                prompt = build_generation_prompt(mod, {'node_id': self.NODES[mod][diff - 1], 'difficulty': diff})
                self.assertIn('Grade 11', prompt)
                self.assertIn(f'TIER CALIBRATION - {label}', prompt)
                self.assertIn(MODULE_TIER_RULES[mod][diff], prompt)
        # An unknown tier falls back to Basics instead of failing
        self.assertIn('TIER CALIBRATION - BASICS', build_generation_prompt('tap_clues', {'difficulty': 9}))

    def test_tap_clues_validator_recomputes_position_index(self):
        ex = {
            "reading_passage": "The skeleton was remarkably pristine, after millions of years in “dry”—arid sand.",
            "locked_words": [{"word_id": "w1", "word": "pristine", "position_index": 2, "correct_clue_ids": ["millions"]}],
        }
        ok, msg = validate_tap_clues_exercise(ex)
        self.assertTrue(ok, msg)
        self.assertEqual(ex['locked_words'][0]['position_index'], 4)   # tokens: The skeleton was remarkably pristine,
        ex['locked_words'][0]['word'] = 'pristin'
        self.assertFalse(validate_tap_clues_exercise(ex)[0])

    def test_fallback_bank_schema_and_tier_coverage(self):
        from .fallback_pool import FALLBACK_BANK
        from .validators import validate_module_exercise
        import copy
        for mod in self.MODULES:
            cases = FALLBACK_BANK[mod]
            for diff in (1, 2, 3):
                self.assertGreaterEqual(sum(c['difficulty'] == diff for c in cases), 5, f'{mod} tier {diff}')
            for c in cases:
                ok, msg = validate_module_exercise(mod, copy.deepcopy(c))
                self.assertTrue(ok, f"{c['exercise_id']}: {msg}")
                self.assertTrue(c['topic_title'] and c['family'])
                self.assertEqual(sorted(h['tier'] for h in c['scaffold_hints']), [1, 2, 3])
                if mod == 'logic_thread':
                    self.assertEqual(len(c['paragraph_blocks']), {1: 3, 2: 4, 3: 5}[c['difficulty']])
                elif mod == 'snap_gap':
                    self.assertEqual(len(c['sentence_pairs']), 1 if c['difficulty'] == 1 else 2)
                    for pid, tile in c['correct_tile_map'].items():
                        for t in c['transition_tile_dock']:
                            if t != tile:
                                self.assertIn(f'{pid}__{t}', c['tile_error_explanations'])
                elif mod == 'tap_clues':
                    w = c['locked_words'][0]
                    self.assertEqual(w['target_clues_count'], len(w['correct_clue_ids']))
                    self.assertNotRegex(c['reading_passage'], rf"(?i)\b{w['word']},? (or|meaning)\b")
                else:
                    self.assertEqual([s['sentence_id'] for s in c['article_sentences']], ['s1', 's2', 's3', 's4'])
                    self.assertIn(c['craap_criterion'], {'CURRENCY', 'RELEVANCE', 'AUTHORITY', 'ACCURACY', 'PURPOSE'})

    def test_fallback_batch_stays_in_tier_and_prefers_node_family(self):
        from .fallback_pool import node_family
        for mod in self.MODULES:
            for diff in (1, 2, 3):
                node = self.NODES[mod][diff - 1]
                family = node_family(mod, node, 'AUTHORITY' if mod == 'fact_scanner' else None)
                batch = get_fallback_batch(mod, diff, count=5, family=family)
                self.assertEqual(len(batch), 5)
                self.assertEqual({ex['difficulty'] for ex in batch}, {diff})
                self.assertEqual(len({ex['exercise_id'] for ex in batch}), 5)
                self.assertEqual(batch[0]['family'], family)
                if mod == 'logic_thread':
                    for ex in batch:
                        self.assertNotEqual([b['block_id'] for b in ex['paragraph_blocks']], ex['correct_sequence'])

    def test_fallback_batch_puts_unseen_cases_first(self):
        first = get_fallback_batch('tap_clues', 2, count=3)
        seen = {calculate_question_hash('tap_clues', ex) for ex in first}
        second = get_fallback_batch('tap_clues', 2, count=3, exclude_hashes=seen)
        self.assertFalse(seen & {calculate_question_hash('tap_clues', ex) for ex in second})
        # Logic Thread cases hash the same however their cards were shuffled
        a = get_fallback_batch('logic_thread', 3, count=6)
        b = get_fallback_batch('logic_thread', 3, count=6)
        self.assertEqual({calculate_question_hash('logic_thread', ex) for ex in a},
                         {calculate_question_hash('logic_thread', ex) for ex in b})

    def test_offline_sessions_serve_tiered_grade11_cases(self):
        from .fallback_pool import FALLBACK_BANK
        bank_ids = {c['exercise_id'] for cases in FALLBACK_BANK.values() for c in cases}
        for mod in self.MODULES:
            for diff, node in enumerate(self.NODES[mod], 1):
                session = SessionService.start_or_get_session(
                    student_id=f'grade11_{mod}', module=mod, node_id=node, force_fresh=True)
                self.assertEqual(session['total_exercises'], 5)
                self.assertTrue(session['is_fallback'])
                self.assertEqual(session['difficulty'], diff)
                for ex in session['exercises']:
                    self.assertIn(ex['exercise_id'], bank_ids)
                    self.assertEqual(ex['difficulty'], diff)


class _HintStubUser:
    is_authenticated = True

    def __init__(self, uid):
        self.id = uid
        self.email = f'{uid}@example.com'


class HintLimitPerCaseTests(TestCase):
    """
    Opening guidance (sidebar lightbulb) is free; only "Dig deeper" counts, at most 3 per case (question),
    enforced by the session API whatever the client does. Every level is built from the active case.
    """

    NODES = {'logic_thread': 'log_node_10', 'snap_gap': 'snp_node_01',
             'tap_clues': 'tap_node_01', 'fact_scanner': 'fac_node_01'}

    def client_for(self, uid):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=_HintStubUser(uid))
        return client

    def start(self, uid, module):
        return SessionService.start_or_get_session(student_id=uid, module=module,
                                                   node_id=self.NODES[module], force_fresh=True)

    def test_guidance_is_free_and_only_dig_deeper_counts_in_every_module(self):
        from .case_hints import case_hint
        for module in self.NODES:
            uid = f'hint_cap_{module}'
            session = self.start(uid, module)
            client, sid, ex = self.client_for(uid), session['session_id'], session['exercises'][0]
            feedback, live = f'/api/ai/session/{sid}/feedback/0/', f'/api/ai/session/{sid}/live-hint/0/'
            # Opening the guidance any number of times, at any requested tier, costs nothing
            for tier in (0, 1, 3, 3):
                res = client.post(feedback, {'tier': tier}, format='json')
                self.assertEqual(res.status_code, 200, (module, res.data))
                self.assertEqual((res.data['hints_remaining'], res.data['hint_tier']), (3, 0), module)
                self.assertEqual(res.data['hint'], case_hint(module, ex, 0))
            # Dig deeper: 3 -> 2 -> 1 -> 0, each level a different, case-specific hint
            texts = []
            for level in (1, 2, 3):
                res = client.post(live, {'submission_state': {}}, format='json')
                self.assertEqual(res.status_code, 200, (module, level))
                self.assertEqual((res.data['hint_level'], res.data['hints_used'], res.data['hints_remaining']),
                                 (level, level, 3 - level), module)
                self.assertEqual(res.data['socratic_hint'], case_hint(module, ex, level))   # Gemini is off in tests
                texts.append(res.data['socratic_hint'])
            self.assertEqual(len(set(texts)), 3, module)
            res = client.post(live, {'submission_state': {}}, format='json')
            self.assertEqual(res.status_code, 429, module)
            self.assertEqual(res.data['error'], 'hint_limit_reached')
            self.assertEqual(res.data['detail'], 'Maximum of 3 hints per question reached.')
            # The opening guidance stays readable after the cap
            self.assertEqual(client.post(feedback, {'tier': 1}, format='json').status_code, 200)
            # The next case starts with a fresh allowance
            res = client.post(f'/api/ai/session/{sid}/live-hint/1/', {'submission_state': {}}, format='json')
            self.assertEqual((res.status_code, res.data['hints_remaining']), (200, 2), module)

    def test_hint_gradient_on_every_offline_case(self):
        """Short nudge -> specific clue -> eliminate distractors -> walkthrough, from each case's own content."""
        from .case_hints import case_hint, _family, _NUDGE
        from .fallback_pool import FALLBACK_BANK
        for module, cases in FALLBACK_BANK.items():
            for ex in cases:
                levels = [case_hint(module, ex, lvl) for lvl in range(4)]
                eid = ex['exercise_id']
                self.assertEqual(len(set(levels)), 4, eid)
                self.assertLessEqual(len(levels[0].split()), 30, eid)            # the free nudge fits at a glance
                for text in levels:
                    self.assertLessEqual(len(text.split()), 70, eid)             # every level fits the popover
                    self.assertTrue(text.rstrip().endswith(('.', '?', '"')), (eid, text))   # whole sentences only
                    for stock in ('First, Then', 'Meanwhile and Finally'):
                        self.assertNotIn(stock, text)
                if module == 'snap_gap':
                    pid = ex['sentence_pairs'][0]['pair_id']
                    tile = ex['correct_tile_map'][pid]
                    self.assertIn(_NUDGE[_family(tile)], levels[0], eid)          # the right kind of link is on offer
                    self.assertNotIn(f'"{tile}"', levels[0] + levels[1], eid)    # ...but no tile is named yet
                    self.assertIn('Rule out', levels[2], eid)
                    self.assertNotIn(f'Rule out "{tile}"', levels[2], eid)       # never eliminates the answer
                    self.assertIn(f'Choose "{tile}"', levels[3], eid)
                elif module == 'tap_clues':
                    w = ex['locked_words'][0]
                    self.assertIn(w['word'], levels[0], eid)
                    for clue in w['correct_clue_ids']:
                        self.assertNotIn(f'"{clue}"', levels[0], eid)
                        self.assertIn(f'"{clue}"', levels[3], eid)
                    self.assertIn('Not "', levels[2], eid)
                elif module == 'fact_scanner':
                    flawed = [x['sentence_id'] for x in ex['article_sentences'] if x['is_flawed']]
                    self.assertIn(ex['craap_criterion'], levels[0], eid)
                    self.assertIn('holds up', levels[2], eid)
                    for sid in flawed:
                        self.assertNotIn(f'{sid} holds up', levels[2], eid)       # never clears the flawed one
                    self.assertIn(f'Quarantine {flawed[0]}', levels[3], eid)
                else:
                    opener = next(b['text'] for b in ex['paragraph_blocks'] if b['block_id'] == ex['correct_sequence'][0])
                    self.assertIn(' '.join(opener.split()[:3]).rstrip(',;:.'), levels[3], eid)

    def test_wrong_answer_explanations_are_free_and_only_carry_level_zero(self):
        from .case_hints import case_hint
        uid = 'hint_explain'
        session = self.start(uid, 'snap_gap')
        client, sid = self.client_for(uid), session['session_id']
        ex = session['exercises'][0]
        pair_id = ex['sentence_pairs'][0]['pair_id']
        wrong = next(t for t in ex['transition_tile_dock'] if t != ex['correct_tile_map'][pair_id])
        for _ in range(5):
            res = client.post(f'/api/ai/session/{sid}/feedback/0/',
                              {'pair_id': pair_id, 'selected_tile': wrong, 'tier': 3}, format='json')
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data['hints_remaining'], 3)
            self.assertEqual(res.data['hint'], case_hint('snap_gap', ex, 0))
            self.assertTrue(res.data['explanation'])

    def test_reload_keeps_the_count_and_the_unlocked_hints(self):
        uid = 'hint_reload'
        session = self.start(uid, 'tap_clues')
        client, sid = self.client_for(uid), session['session_id']
        client.post(f'/api/ai/session/{sid}/feedback/0/', {'tier': 0}, format='json')   # free, not logged
        texts = [client.post(f'/api/ai/session/{sid}/live-hint/0/', {'submission_state': {}}, format='json')
                 .data['socratic_hint'] for _ in range(2)]
        reloaded = SessionService.start_or_get_session(student_id=uid, module='tap_clues',
                                                       node_id=self.NODES['tap_clues'], force_fresh=False)
        self.assertEqual(reloaded['session_id'], sid)
        self.assertEqual(reloaded['max_hints_per_question'], 3)
        self.assertEqual(reloaded['case_hints'], {'0': 2})
        self.assertEqual(reloaded['case_hint_log'], {'0': texts})
        # A fresh start (Retry docket / Fresh Case) is a new session with a clean allowance
        fresh = self.start(uid, 'tap_clues')
        self.assertNotEqual(fresh['session_id'], sid)
        self.assertEqual(fresh['case_hints'], {})

    def test_live_hint_requires_the_session_owner(self):
        session = self.start('hint_owner', 'fact_scanner')
        res = self.client_for('someone_else').post(
            f"/api/ai/session/{session['session_id']}/live-hint/0/", {'submission_state': {}}, format='json')
        self.assertEqual(res.status_code, 403)



class TapCluesTierCountTests(TestCase):
    """Tap Clues carries exactly 2 / 3 / 4 clue words for Basics / Intermediate / Advanced, everywhere."""

    NODES = {1: 'tap_node_01', 2: 'tap_node_02', 3: 'tap_node_03'}

    def test_offline_bank_has_exact_tier_counts(self):
        from .fallback_pool import FALLBACK_BANK
        from .validators import TAP_CLUES_PER_TIER, tap_clue_words
        for ex in FALLBACK_BANK['tap_clues']:
            w = ex['locked_words'][0]
            need = TAP_CLUES_PER_TIER[ex['difficulty']]
            self.assertEqual(len(w['correct_clue_ids']), need, ex['exercise_id'])
            self.assertEqual(w['context_clues'], w['correct_clue_ids'], ex['exercise_id'])
            self.assertEqual(w['target_clues_count'], need, ex['exercise_id'])
            # every clue is a clean, tappable, non-target passage word
            self.assertEqual(tap_clue_words(ex['reading_passage'], w['word'], w['correct_clue_ids']),
                             w['correct_clue_ids'], ex['exercise_id'])

    def test_validator_enforces_the_tier_count(self):
        from .validators import validate_module_exercise
        passage = ('During the long drought, the family grew frugal. Every peso was budgeted, leftovers were saved, '
                   'and their economical habits lasted for years.')

        def case(clues):
            return {'reading_passage': passage,
                    'locked_words': [{'word_id': 'w1', 'word': 'frugal', 'correct_clue_ids': clues}]}

        ok, why = validate_module_exercise('tap_clues', case(['budgeted', 'saved', 'economical']), 1)
        self.assertFalse(ok)                                            # 3 clues for Basics: rejected, not trimmed
        self.assertIn('needs exactly 2', why)
        ex = case(['budgeted', 'saved'])                                # exactly Basics
        self.assertTrue(validate_module_exercise('tap_clues', ex, 1)[0])
        w = ex['locked_words'][0]
        self.assertEqual((w['correct_clue_ids'], w['context_clues'], w['target_clues_count']),
                         (['budgeted', 'saved'], ['budgeted', 'saved'], 2))
        ex = case(['budgeted', 'saved', 'economical'])                  # exactly Intermediate
        self.assertTrue(validate_module_exercise('tap_clues', ex, 2)[0])
        self.assertEqual(ex['locked_words'][0]['target_clues_count'], 3)
        ok, why = validate_module_exercise('tap_clues', case(['budgeted', 'saved', 'economical']), 3)
        self.assertFalse(ok)                                            # Advanced needs 4
        self.assertIn('needs exactly 4', why)
        # phrases and function words never count as clues
        ok, _ = validate_module_exercise('tap_clues', case(['budgeted', 'the family', 'was', 'saved']), 3)
        self.assertFalse(ok)

    def test_prompt_asks_for_the_exact_count(self):
        for diff, node in self.NODES.items():
            prompt = build_generation_prompt('tap_clues', {'node_id': node, 'difficulty': diff})
            self.assertIn(f'EXACTLY {diff + 1} distinct context clues', prompt)
            self.assertNotIn('Include all valid context clues', prompt)

    def test_offline_sessions_serve_exact_counts_per_tier(self):
        for diff, node in self.NODES.items():
            session = SessionService.start_or_get_session(
                student_id=f'tap_count_{diff}', module='tap_clues', node_id=node, force_fresh=True)
            self.assertEqual(session['difficulty'], diff)
            for ex in session['exercises']:
                w = ex['locked_words'][0]
                self.assertEqual(len(w['correct_clue_ids']), diff + 1, (node, ex['exercise_id']))
                self.assertEqual(w['target_clues_count'], diff + 1, (node, ex['exercise_id']))

    def _client(self, uid):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=_HintStubUser(uid))
        return client

    def test_session_endpoint_serves_exact_counts_per_tier(self):
        """GET /api/ai/session/tap_clues/<node>/: tap_node_01 -> 2, tap_node_02 -> 3, tap_node_03 -> 4 on every case."""
        from unittest import mock
        from .fallback_pool import fallback_bank
        bank = {c['exercise_id']: c for c in fallback_bank()['tap_clues']}
        with mock.patch('api.ai.views.ProgressionManagementService.is_node_unlocked', return_value=True):
            for diff, node in self.NODES.items():
                res = self._client(f'tap_endpoint_{diff}').get(f'/api/ai/session/tap_clues/{node}/?fresh=true')
                self.assertEqual(res.status_code, 200, res.data)
                self.assertEqual(res.data['difficulty'], diff)
                first = res.data['exercises'][0]
                self.assertEqual(first['exercise_id'], f'fb_{node}')                     # the node's own case first
                self.assertEqual(first['reading_passage'], bank[f'fb_{node}']['reading_passage'])
                for ex in res.data['exercises']:
                    w = ex['locked_words'][0]
                    self.assertEqual((len(w['correct_clue_ids']), w['target_clues_count']), (diff + 1, diff + 1),
                                     (node, ex['exercise_id']))

    def test_resumed_session_repairs_a_stale_case(self):
        """A session saved with an old 2-clue copy of tap_node_02's case is repaired to the current 3-clue case."""
        from .mongo_models import GeneratedSessionDocument
        uid = 'tap_stale'
        session = SessionService.start_or_get_session(student_id=uid, module='tap_clues',
                                                      node_id='tap_node_02', force_fresh=True)
        doc = GeneratedSessionDocument.objects(session_id=session['session_id']).first()
        stale = [dict(e) for e in doc.exercises]
        old = dict(stale[0])
        old['reading_passage'] = ("During the long drought, the Dela Cruz family grew frugal. Every peso was budgeted, "
                                  "leftovers became the next day's meal, and the economical habits they learned outlasted "
                                  "the crisis by many years.")
        old['locked_words'] = [dict(old['locked_words'][0], correct_clue_ids=['budgeted', 'economical'],
                                    context_clues=['budgeted', 'economical'], target_clues_count=2)]
        stale[0] = old
        doc.exercises = stale
        doc.save()
        resumed = SessionService.start_or_get_session(student_id=uid, module='tap_clues',
                                                      node_id='tap_node_02', force_fresh=False)
        self.assertEqual(resumed['session_id'], session['session_id'])
        first = resumed['exercises'][0]
        self.assertEqual(first['exercise_id'], 'fb_tap_node_02')
        self.assertEqual(first['locked_words'][0]['correct_clue_ids'], ['budgeted', 'saved', 'economical'])
        self.assertEqual(first['locked_words'][0]['target_clues_count'], 3)
        stored = GeneratedSessionDocument.objects(session_id=session['session_id']).first()
        self.assertEqual(len(stored.exercises[0]['locked_words'][0]['correct_clue_ids']), 3)   # saved, not just served

    def test_bank_reloads_when_its_file_changes(self):
        """A running server picks up an edited fallback_exercises.json without a restart."""
        import json, os, shutil, tempfile, time
        from unittest import mock
        from . import fallback_pool
        tmp = os.path.join(tempfile.mkdtemp(), 'bank.json')
        shutil.copy(fallback_pool._DATA_FILE, tmp)
        try:
            with mock.patch.object(fallback_pool, '_DATA_FILE', tmp):
                self.assertTrue(fallback_pool.fallback_bank()['tap_clues'])
                data = json.load(open(tmp, encoding='utf-8'))
                data['modules']['tap_clues'][0]['topic_title'] = 'Edited While Running'
                json.dump(data, open(tmp, 'w', encoding='utf-8'))
                later = time.time() + 5
                os.utime(tmp, (later, later))
                self.assertEqual(fallback_pool.fallback_bank()['tap_clues'][0]['topic_title'], 'Edited While Running')
        finally:
            fallback_pool._bank_mtime = None
            fallback_pool.fallback_bank()                                              # back to the real file
        self.assertNotEqual(fallback_pool.fallback_bank()['tap_clues'][0]['topic_title'], 'Edited While Running')



class AttemptCreditTests(TestCase):
    """Unlimited practice, but only attempts 1-3 earn credit; a failed attempt 3 latches the case as incorrect."""

    NODES = {'logic_thread': 'log_node_10', 'snap_gap': 'snp_node_01',
             'tap_clues': 'tap_node_01', 'fact_scanner': 'fac_node_01'}

    def client_for(self, uid):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=_HintStubUser(uid))
        return client

    def start(self, uid, module):
        return SessionService.start_or_get_session(student_id=uid, module=module,
                                                   node_id=self.NODES[module], force_fresh=True)

    @staticmethod
    def right_answer(module, ex):
        if module == 'logic_thread':
            return {'sequence': ex['correct_sequence']}
        if module == 'snap_gap':
            return {'board_state': dict(ex['correct_tile_map'])}
        if module == 'tap_clues':
            return {'unlocked_word_ids': [w['word_id'] for w in ex['locked_words']]}
        return {'quarantined_ids': [s['sentence_id'] for s in ex['article_sentences'] if s['is_flawed']]}

    def miss(self, client, sid, module, ex, idx=0):
        """One wrong attempt, through the route each screen uses."""
        if module == 'logic_thread':   # Logic Thread submits every attempt to /evaluate/
            res = client.post(f'/api/ai/session/{sid}/evaluate/{idx}/',
                              {'sequence': list(reversed(ex['correct_sequence']))}, format='json')
            self.assertFalse(res.data['solved'])
        else:                          # the others log wrong steps, then evaluate once solved
            res = client.post(f'/api/ai/session/{sid}/log-attempt/',
                              {'is_correct': False, 'word_id': 'x', 'clue_word': 'y', 'exercise_index': idx}, format='json')
            self.assertEqual(res.status_code, 200)

    def test_solving_on_attempt_four_advances_but_is_graded_incorrect(self):
        from api.scaffold.mongo_models import TelemetryLogDocument
        from .mongo_models import GeneratedSessionDocument
        for module in self.NODES:
            uid = f'credit_late_{module}'
            session = self.start(uid, module)
            client, sid, ex = self.client_for(uid), session['session_id'], session['exercises'][0]
            for _ in range(3):
                self.miss(client, sid, module, ex)
            res = client.post(f'/api/ai/session/{sid}/evaluate/0/', {**self.right_answer(module, ex), 'attempts': 4},
                              format='json')
            self.assertEqual(res.status_code, 200, (module, res.data))
            self.assertEqual((res.data['result'], res.data['solved']), ('correct', True), module)   # it advances...
            self.assertEqual(res.data['current_index'], 1, module)
            self.assertFalse(res.data['is_correct'], module)                                       # ...graded wrong
            self.assertFalse(res.data['credited'], module)
            self.assertTrue(res.data['failed_after_three_attempts'], module)
            self.assertEqual(res.data['attempts'], 4, module)
            last_case = TelemetryLogDocument.objects(student_id=uid, event_type='case').order_by('-id').first()
            self.assertFalse(last_case.is_correct, module)                                         # telemetry: wrong
            stored = GeneratedSessionDocument.objects(session_id=sid).first()
            self.assertEqual(stored.case_results['0']['credited'], False, module)
            self.assertEqual(stored.case_results['0']['solved'], True, module)
            # the latch never flips back, even if a "first try" correct answer is sent again
            again = client.post(f'/api/ai/session/{sid}/evaluate/0/', {**self.right_answer(module, ex), 'attempts': 1},
                                format='json')
            self.assertFalse(again.data['is_correct'], module)
            # the node is not mastered on this run
            mastery = client.post(f'/api/ai/session/{sid}/mastery/', {'hints_used': 0}, format='json')
            self.assertEqual(mastery.status_code, 400, module)
            self.assertEqual(mastery.data['failed_cases'], [1], module)

    def test_solving_within_three_attempts_counts_as_correct(self):
        for module in self.NODES:
            uid = f'credit_ok_{module}'
            session = self.start(uid, module)
            client, sid = self.client_for(uid), session['session_id']
            for idx, ex in enumerate(session['exercises']):
                for _ in range(idx % 3):   # cases solved on attempt 1, 2, 3, 1, 2
                    self.miss(client, sid, module, ex, idx)
                res = client.post(f'/api/ai/session/{sid}/evaluate/{idx}/',
                                  {**self.right_answer(module, ex), 'attempts': idx % 3 + 1}, format='json')
                self.assertTrue(res.data['is_correct'], (module, idx, res.data))
                self.assertEqual(res.data['attempts'], idx % 3 + 1, (module, idx))
            mastery = client.post(f'/api/ai/session/{sid}/mastery/', {'hints_used': 0}, format='json')
            self.assertEqual(mastery.status_code, 200, (module, mastery.data))

    def test_client_reported_late_attempt_is_never_credited(self):
        uid = 'credit_client'
        session = self.start(uid, 'tap_clues')
        client, sid, ex = self.client_for(uid), session['session_id'], session['exercises'][0]
        res = client.post(f'/api/ai/session/{sid}/evaluate/0/', {**self.right_answer('tap_clues', ex), 'attempts': 5},
                          format='json')
        self.assertTrue(res.data['solved'])
        self.assertFalse(res.data['is_correct'])

    def test_attempts_survive_a_reload(self):
        uid = 'credit_reload'
        session = self.start(uid, 'snap_gap')
        client, sid, ex = self.client_for(uid), session['session_id'], session['exercises'][0]
        for _ in range(3):
            self.miss(client, sid, 'snap_gap', ex)
        reloaded = SessionService.start_or_get_session(student_id=uid, module='snap_gap',
                                                       node_id=self.NODES['snap_gap'], force_fresh=False)
        self.assertEqual(reloaded['session_id'], sid)
        self.assertEqual(reloaded['case_attempts'], {'0': 3})
        self.assertEqual(reloaded['case_results']['0']['failed_after_three_attempts'], True)
        fresh = self.start(uid, 'snap_gap')   # Retry docket / Fresh Case: a clean slate
        self.assertEqual((fresh['case_attempts'], fresh['case_results']), ({}, {}))
