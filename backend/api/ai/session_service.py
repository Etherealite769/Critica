# backend/api/ai/session_service.py
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from api.progression.services import ProgressionManagementService
from .mongo_models import StudentQuestionHistoryDocument, GeneratedSessionDocument
from .gemini_client import GeminiClient
from .prompt_builder import build_system_instruction, build_generation_prompt
from .validators import validate_module_exercise, calculate_question_hash
from .fallback_pool import get_fallback_batch

# Module document imports
from api.modules.logic_thread.mongo_models import LogicThreadNodeDocument
from api.modules.snap_gap.mongo_models import CoherenceNodeDocument
from api.modules.tap_clues.mongo_models import VocabularyNodeDocument
from api.modules.fact_scanner.mongo_models import ArticleDocument

logger = logging.getLogger(__name__)

SESSION_EXPIRY_HOURS = 2
EXERCISES_PER_SESSION = 5


def _get_node_difficulty(node_id: str) -> int:
    try:
        parts = node_id.split('_')
        num = int(parts[-1])
        if num % 3 == 1: return 1
        if num % 3 == 2: return 2
        return 3
    except Exception:
        return 1


class SessionService:

    @staticmethod
    def load_node_metadata(module: str, node_id: str) -> Dict[str, Any]:
        """Loads static metadata & micro-lesson text from the module's node document."""
        diff = _get_node_difficulty(node_id)
        data = {
            'node_id': node_id,
            'title': f'Node {node_id}',
            'focus': 'Reading Comprehension Mastery',
            'micro_lesson_text': 'Read the passage carefully and apply logical reasoning.',
            'difficulty': diff,
            'craap_criterion': 'CURRENCY',
            'word_count': 0,
        }

        if module == 'logic_thread':
            node = LogicThreadNodeDocument.objects(node_id=node_id).first()
            if node:
                data.update({
                    'title': node.title or data['title'],
                    'focus': node.focus or data['focus'],
                    'micro_lesson_text': node.micro_lesson_text or data['micro_lesson_text'],
                    'word_count': node.word_count,
                })
        elif module == 'snap_gap':
            node = CoherenceNodeDocument.objects(node_id=node_id).first()
            if node:
                data.update({
                    'title': node.title or data['title'],
                    'focus': node.focus or data['focus'],
                    'micro_lesson_text': node.micro_lesson_text or data['micro_lesson_text'],
                    'word_count': node.word_count,
                })
        elif module == 'tap_clues':
            node = VocabularyNodeDocument.objects(node_id=node_id).first()
            if node:
                data.update({
                    'title': node.title or data['title'],
                    'focus': node.focus or data['focus'],
                    'micro_lesson_text': node.micro_lesson_text or data['micro_lesson_text'],
                    'word_count': node.word_count,
                })
        elif module == 'fact_scanner':
            node = ArticleDocument.objects(node_id=node_id).first()
            if node:
                data.update({
                    'title': node.title or data['title'],
                    'focus': node.focus or data['focus'],
                    'craap_criterion': getattr(node, 'craap_criterion', 'CURRENCY') or 'CURRENCY',
                    'micro_lesson_text': node.micro_lesson_text or data['micro_lesson_text'],
                    'word_count': node.word_count,
                })

        return data

    @staticmethod
    def get_student_history(student_id: str, module: str, node_id: str) -> Tuple[List[str], set]:
        """Returns list of past topic titles and set of SHA256 question hashes."""
        history = StudentQuestionHistoryDocument.objects(
            student_id=student_id,
            module=module,
            node_id=node_id
        ).order_by('-created_at')[:20]

        topics = [h.topic_summary for h in history if h.topic_summary]
        hashes = {h.question_hash for h in history if h.question_hash}
        return topics, hashes

    @staticmethod
    def record_question_history(student_id: str, module: str, node_id: str, exercises: List[Dict[str, Any]]):
        """Records generated exercise hashes and topics into student history."""
        for ex in exercises:
            q_hash = calculate_question_hash(module, ex)
            topic = ex.get('topic_title', '')
            diff = ex.get('difficulty', _get_node_difficulty(node_id))
            try:
                StudentQuestionHistoryDocument(
                    student_id=student_id,
                    module=module,
                    node_id=node_id,
                    question_hash=q_hash,
                    topic_summary=topic,
                    difficulty=diff,
                ).save()
            except Exception as e:
                logger.error(f"Failed to record student question history: {e}")

    @classmethod
    def start_or_get_session(
        cls,
        student_id: str,
        module: str,
        node_id: str,
        force_fresh: bool = False
    ) -> Dict[str, Any]:
        """
        Retrieves an ongoing valid session or generates a brand new 5-question AI session.
        """
        # 1. Check for existing active session unless force_fresh is requested
        if not force_fresh:
            existing = GeneratedSessionDocument.objects(
                student_id=student_id,
                module=module,
                node_id=node_id,
                is_completed=False,
            ).order_by('-created_at').first()

            if existing and not existing.is_expired() and len(existing.exercises) >= EXERCISES_PER_SESSION:
                node_meta = cls.load_node_metadata(module, node_id)
                return cls._serialize_session_response(existing, node_meta)

        # 2. Load node metadata
        node_meta = cls.load_node_metadata(module, node_id)
        past_topics, past_hashes = cls.get_student_history(student_id, module, node_id)

        # 3. Call Gemini AI for dynamic generation
        client = GeminiClient()
        system_inst = build_system_instruction()
        prompt = build_generation_prompt(
            module=module,
            node_info=node_meta,
            previous_topics=past_topics,
            count=EXERCISES_PER_SESSION,
        )

        generated_raw = client.generate_structured_session(
            module=module,
            system_instruction=system_inst,
            user_prompt=prompt,
        )

        valid_exercises = []
        if generated_raw and isinstance(generated_raw.get('exercises'), list):
            for ex in generated_raw['exercises']:
                # Run module validator
                is_valid, reason = validate_module_exercise(module, ex)
                if not is_valid:
                    logger.warning(f"Discarding invalid generated exercise ({reason})")
                    continue

                # Check duplicate hash against student's history
                q_hash = calculate_question_hash(module, ex)
                if q_hash in past_hashes:
                    logger.info(f"Discarding duplicate exercise hash {q_hash}")
                    continue

                valid_exercises.append(ex)
                past_hashes.add(q_hash)

        # 4. Fill remaining exercises from curated fallback pool if needed
        diff = node_meta['difficulty']
        if len(valid_exercises) < EXERCISES_PER_SESSION:
            missing_count = EXERCISES_PER_SESSION - len(valid_exercises)
            fallback_items = get_fallback_batch(module, diff, count=missing_count)
            valid_exercises.extend(fallback_items[:missing_count])

        # 5. Create new session document
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=SESSION_EXPIRY_HOURS)

        session_doc = GeneratedSessionDocument(
            session_id=session_id,
            student_id=student_id,
            module=module,
            node_id=node_id,
            difficulty=diff,
            exercises=valid_exercises,
            current_index=0,
            is_completed=False,
            created_at=now,
            expires_at=expires_at,
        )
        session_doc.save()

        # 6. Record question history
        cls.record_question_history(student_id, module, node_id, valid_exercises)

        return cls._serialize_session_response(session_doc, node_meta)

    @classmethod
    def evaluate_exercise_submission(
        cls,
        session_id: str,
        exercise_index: int,
        submission_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates a student's answer submission for exercise at exercise_index.
        """
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'status': 'error', 'message': 'Session not found'}

        if exercise_index < 0 or exercise_index >= len(session_doc.exercises):
            return {'status': 'error', 'message': 'Invalid exercise index'}

        ex = session_doc.exercises[exercise_index]
        module = session_doc.module

        if module == 'logic_thread':
            submitted_seq = submission_payload.get('sequence', [])
            correct_seq = ex.get('correct_sequence', [])
            is_correct = (submitted_seq == correct_seq)
            return {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'is_correct': is_correct,
            }

        elif module == 'snap_gap':
            board_state = submission_payload.get('board_state', {})
            correct_tile_map = ex.get('correct_tile_map', {})
            incorrect_pairs = [
                pid for pid, tile in board_state.items()
                if correct_tile_map.get(pid) != tile
            ]
            is_correct = (len(incorrect_pairs) == 0 and len(board_state) == len(correct_tile_map))
            return {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'incorrect_pairs': incorrect_pairs,
                'is_correct': is_correct,
            }

        elif module == 'tap_clues':
            unlocked_ids = submission_payload.get('unlocked_word_ids', [])
            locked_words = ex.get('locked_words', [])
            all_ids = [w.get('word_id') for w in locked_words]
            remaining = [wid for wid in all_ids if wid not in unlocked_ids]
            is_correct = (len(remaining) == 0)
            return {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'remaining_word_ids': remaining,
                'is_correct': is_correct,
            }

        elif module == 'fact_scanner':
            quarantined_ids = submission_payload.get('quarantined_ids', [])
            sentences = ex.get('article_sentences', [])
            flawed_ids = [s.get('sentence_id') for s in sentences if s.get('is_flawed')]
            remaining_flawed = [fid for fid in flawed_ids if fid not in quarantined_ids]
            wrongly_quarantined = [qid for qid in quarantined_ids if qid not in flawed_ids]
            is_correct = (len(remaining_flawed) == 0 and len(wrongly_quarantined) == 0)
            return {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'remaining_flawed_ids': remaining_flawed,
                'wrongly_quarantined': wrongly_quarantined,
                'is_correct': is_correct,
            }

        return {'status': 'error', 'message': f'Unsupported module {module}'}

    @classmethod
    def get_exercise_feedback(
        cls,
        session_id: str,
        exercise_index: int,
        feedback_query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Provides dynamic explanations and tiered scaffold hints for the current exercise."""
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'explanation': 'Session not found.', 'hint': '', 'hint_tier': 1}

        if exercise_index < 0 or exercise_index >= len(session_doc.exercises):
            return {'explanation': 'Invalid index.', 'hint': '', 'hint_tier': 1}

        ex = session_doc.exercises[exercise_index]
        hints = ex.get('scaffold_hints', [])
        requested_tier = feedback_query.get('tier', 1)

        hint_text = ''
        for h in hints:
            if h.get('tier') == requested_tier:
                hint_text = h.get('hint_text', '')
                break
        if not hint_text and hints:
            hint_text = hints[0].get('hint_text', '')

        # Specific module explanations
        module = session_doc.module
        explanation = ''
        if module == 'logic_thread':
            src = feedback_query.get('source_id', '')
            tgt = feedback_query.get('target_id', '')
            exp_map = ex.get('structural_explanations', {})
            explanation = exp_map.get(f"{src}__{tgt}", "Re-evaluate the logical transition and sequence.")
        elif module == 'snap_gap':
            pid = feedback_query.get('pair_id', '')
            tile = feedback_query.get('selected_tile', '')
            exp_map = ex.get('tile_error_explanations', {})
            explanation = exp_map.get(f"{pid}__{tile}", "That transition tile does not fit the logical relation.")
        elif module == 'tap_clues':
            wid = feedback_query.get('word_id', '')
            clue = feedback_query.get('clue_word', '')
            exp_map = ex.get('clue_error_explanations', {})
            explanation = exp_map.get(f"{wid}__{clue}", "That word is not a context clue for the locked word.")
        elif module == 'fact_scanner':
            sid = feedback_query.get('sentence_id', '')
            exp_map = ex.get('sentence_explanations', {})
            explanation = exp_map.get(sid, "Check whether this sentence adheres to the CRAAP criterion.")

        return {
            'explanation': explanation,
            'hint': hint_text,
            'hint_tier': requested_tier,
        }

    @classmethod
    def complete_session(cls, session_id: str, student_id: str, username: str) -> Dict[str, Any]:
        """Marks the session complete and advances progression in the database."""
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'status': 'error', 'message': 'Session not found'}

        session_doc.is_completed = True
        session_doc.save()

        # Update student progression
        prog_result = ProgressionManagementService.update_progression(
            student_id=student_id,
            node_id=session_doc.node_id,
            username=username,
        )

        return {
            'status': 'mastered',
            'session_id': session_id,
            'node_id': session_doc.node_id,
            'next_node': prog_result.get('next_node'),
            'streak': prog_result.get('streak', 0),
            'unlocked_nodes': prog_result.get('unlocked_nodes', []),
        }

    @staticmethod
    def _serialize_session_response(session_doc: GeneratedSessionDocument, node_meta: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'session_id': session_doc.session_id,
            'node_id': session_doc.node_id,
            'module': session_doc.module,
            'title': node_meta.get('title', ''),
            'focus': node_meta.get('focus', ''),
            'difficulty': session_doc.difficulty,
            'micro_lesson_text': node_meta.get('micro_lesson_text', ''),
            'deep_dive_required': node_meta.get('word_count', 0) > 300,
            'reading_passage': node_meta.get('reading_passage', ''),
            'total_exercises': len(session_doc.exercises),
            'exercises': session_doc.exercises,
            'current_index': session_doc.current_index,
        }
