# backend/api/ai/session_service.py
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set

from api.progression.services import ProgressionManagementService
from .mongo_models import StudentQuestionHistoryDocument, GeneratedSessionDocument
from .gemini_client import GeminiClient
from .prompt_builder import build_system_instruction, build_generation_prompt, build_socratic_hint_prompt
from .validators import (
    validate_module_exercise,
    calculate_question_hash,
    check_novelty_against_history,
    check_intra_session_diversity,
)
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
    def get_student_history(student_id: str, module: str, node_id: str) -> Tuple[List[str], Set[str], List[str]]:
        """
        Returns all past topic summaries, SHA256 hashes, and passage excerpts
        encountered by this student across all previous takes.
        """
        history = StudentQuestionHistoryDocument.objects(
            student_id=student_id,
            module=module,
            node_id=node_id
        ).order_by('-created_at')[:50]

        topics = [h.topic_summary for h in history if h.topic_summary]
        hashes = {h.question_hash for h in history if h.question_hash}
        passages = [h.passage_excerpt for h in history if getattr(h, 'passage_excerpt', None)]
        return topics, hashes, passages

    @staticmethod
    def record_question_history(student_id: str, module: str, node_id: str, exercises: List[Dict[str, Any]]):
        """Records generated exercise hashes, topics, and passage excerpts into student history."""
        for ex in exercises:
            q_hash = calculate_question_hash(module, ex)
            topic = ex.get('topic_title', '')
            passage = ex.get('reading_passage', '')[:300]
            diff = ex.get('difficulty', _get_node_difficulty(node_id))
            try:
                StudentQuestionHistoryDocument(
                    student_id=student_id,
                    module=module,
                    node_id=node_id,
                    question_hash=q_hash,
                    topic_summary=topic,
                    passage_excerpt=passage,
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
        Retrieves an ongoing valid session or generates a brand new 5-question AI session
        with guaranteed novelty across retakes.
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
        else:
            # Mark all previous uncompleted sessions as completed/superseded
            GeneratedSessionDocument.objects(
                student_id=student_id,
                module=module,
                node_id=node_id,
                is_completed=False,
            ).update(set__is_completed=True)

        # 2. Load node metadata & student historical records
        node_meta = cls.load_node_metadata(module, node_id)
        past_topics, past_hashes, past_passages = cls.get_student_history(student_id, module, node_id)

        # 3. Call Gemini AI for dynamic generation with anti-repetition constraints
        client = GeminiClient()
        system_inst = build_system_instruction()
        prompt = build_generation_prompt(
            module=module,
            node_info=node_meta,
            previous_topics=past_topics,
            previous_passages=past_passages,
            count=EXERCISES_PER_SESSION,
        )

        generated_raw = client.generate_structured_session(
            module=module,
            system_instruction=system_inst,
            user_prompt=prompt,
        )

        valid_exercises: List[Dict[str, Any]] = []
        model_used = ''
        latency_ms = 0

        if generated_raw:
            model_used = generated_raw.get('_model_used', '')
            latency_ms = generated_raw.get('_latency_ms', 0)

            if isinstance(generated_raw.get('exercises'), list):
                for ex in generated_raw['exercises']:
                    # Module syntactic/structural validation
                    is_valid, reason = validate_module_exercise(module, ex)
                    if not is_valid:
                        logger.warning(f"Discarding invalid generated exercise ({reason})")
                        continue

                    # Historical novelty validation (hash & Jaccard semantic distance)
                    is_novel, reason = check_novelty_against_history(module, ex, past_hashes, past_passages)
                    if not is_novel:
                        logger.info(f"Discarding repetitive exercise: {reason}")
                        continue

                    valid_exercises.append(ex)
                    past_hashes.add(calculate_question_hash(module, ex))
                    if ex.get('reading_passage'):
                        past_passages.append(ex.get('reading_passage'))

        # 4. If fewer than required exercises, perform a fast retry pass for the remainder
        diff = node_meta['difficulty']
        if len(valid_exercises) < EXERCISES_PER_SESSION and client.is_available():
            missing = EXERCISES_PER_SESSION - len(valid_exercises)
            retry_prompt = build_generation_prompt(
                module=module,
                node_info=node_meta,
                previous_topics=past_topics + [ex.get('topic_title', '') for ex in valid_exercises],
                previous_passages=past_passages,
                count=missing,
            )
            retry_raw = client.generate_structured_session(
                module=module,
                system_instruction=system_inst,
                user_prompt=retry_prompt,
            )
            if retry_raw and isinstance(retry_raw.get('exercises'), list):
                for ex in retry_raw['exercises']:
                    if len(valid_exercises) >= EXERCISES_PER_SESSION:
                        break
                    is_valid, _ = validate_module_exercise(module, ex)
                    is_novel, _ = check_novelty_against_history(module, ex, past_hashes, past_passages)
                    if is_valid and is_novel:
                        valid_exercises.append(ex)
                        past_hashes.add(calculate_question_hash(module, ex))
                        if ex.get('reading_passage'):
                            past_passages.append(ex.get('reading_passage'))

        # 5. Fill remaining from curated fallback pool, filtering out any previously seen fallbacks
        is_fallback = False
        if len(valid_exercises) < EXERCISES_PER_SESSION:
            is_fallback = True
            missing_count = EXERCISES_PER_SESSION - len(valid_exercises)
            fallback_items = get_fallback_batch(module, diff, count=missing_count * 3, exclude_hashes=past_hashes)
            # Filter unseen fallbacks
            unseen_fallbacks = [
                fb for fb in fallback_items
                if calculate_question_hash(module, fb) not in past_hashes
            ]
            if len(unseen_fallbacks) < missing_count:
                unseen_fallbacks = fallback_items
            valid_exercises.extend(unseen_fallbacks[:missing_count])

        # 6. Verify intra-session diversity
        check_intra_session_diversity(valid_exercises)

        # 7. Create new session document
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
            is_fallback=is_fallback,
            model_used=model_used,
            latency_ms=latency_ms,
            created_at=now,
            expires_at=expires_at,
        )
        session_doc.save()

        # 8. Record question history for future novelty enforcement
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
    def get_live_socratic_hint(
        cls,
        session_id: str,
        exercise_index: int,
        submission_payload: Dict[str, Any],
        error_count: int = 1,
    ) -> Dict[str, Any]:
        """
        Generates dynamic on-demand Socratic pedagogical advice using Gemini.
        """
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc or exercise_index < 0 or exercise_index >= len(session_doc.exercises):
            return {'socratic_hint': 'Review the passage carefully for key transitions and clues.'}

        ex = session_doc.exercises[exercise_index]
        client = GeminiClient()
        if not client.is_available():
            # Fallback to pre-generated tier 2 hint
            hints = ex.get('scaffold_hints', [])
            fallback_hint = hints[1].get('hint_text', '') if len(hints) > 1 else 'Look closely at logical connections.'
            return {'socratic_hint': fallback_hint}

        prompt = build_socratic_hint_prompt(
            module=session_doc.module,
            exercise=ex,
            submission_state=submission_payload,
            error_count=error_count,
        )

        hint = client.generate_live_socratic_hint(prompt)
        return {'socratic_hint': hint or 'Examine how the ideas connect in sequence.'}

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

        # Module-specific error explanations
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
            'is_fallback': getattr(session_doc, 'is_fallback', False),
            'model_used': getattr(session_doc, 'model_used', ''),
        }
