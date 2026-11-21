# backend/api/ai/session_service.py
import re
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set

from pymongo import ReturnDocument

from api.progression.services import ProgressionManagementService
from .mongo_models import StudentQuestionHistoryDocument, GeneratedSessionDocument
from .gemini_client import GeminiClient
from .prompt_builder import build_system_instruction, build_generation_prompt, build_socratic_hint_prompt
from .validators import (
    validate_module_exercise,
    calculate_question_hash,
    check_novelty_against_history,
    check_intra_session_diversity,
    enforce_tap_clue_count,
)
from .fallback_pool import get_fallback_batch, node_family, fallback_bank, _prepare
from .case_hints import case_hint

# Module document imports
from api.modules.logic_thread.mongo_models import LogicThreadNodeDocument
from api.modules.snap_gap.mongo_models import CoherenceNodeDocument
from api.modules.tap_clues.mongo_models import VocabularyNodeDocument
from api.modules.fact_scanner.mongo_models import ArticleDocument

logger = logging.getLogger(__name__)

SESSION_EXPIRY_HOURS = 2
EXERCISES_PER_SESSION = 5
MAX_HINTS_PER_QUESTION = 3

# Attempt credit: practice is unlimited, but only the first CREDIT_ATTEMPTS attempts on a case can earn credit.
# Once attempt 3 fails the case is latched as failed; a later solve advances the cadet but is graded incorrect.
CREDIT_ATTEMPTS = 3


def record_wrong_attempt(session_doc, exercise_index: int) -> int:
    """
    Counts one wrong submission on a case (atomically) and returns the new total. When it reaches
    CREDIT_ATTEMPTS the case is latched as failed for grading, unless it was already solved.
    """
    coll = GeneratedSessionDocument._get_collection()
    key = str(exercise_index)
    doc = coll.find_one_and_update(
        {'_id': session_doc.pk},
        {'$inc': {f'case_attempts.{key}': 1}},
        projection={'case_attempts': 1, 'case_results': 1},
        return_document=ReturnDocument.AFTER,
    )
    wrongs = int(((doc or {}).get('case_attempts') or {}).get(key, 0))
    prior = ((doc or {}).get('case_results') or {}).get(key) or {}
    if wrongs >= CREDIT_ATTEMPTS and not prior.get('solved'):
        coll.update_one({'_id': session_doc.pk}, {'$set': {f'case_results.{key}': {
            'attempts': wrongs, 'solved': False, 'credited': False, 'failed_after_three_attempts': True}}})
    return wrongs


class HintLimitReached(Exception):
    """The student has already used every hint allowed on this case."""


# A feedback request that carries the student's wrong answer is an explanation of that answer, not a hint request
_ANSWER_FIELDS = {
    'logic_thread': ('source_id', 'target_id'),
    'snap_gap': ('selected_tile',),
    'tap_clues': ('clue_word',),
    'fact_scanner': ('sentence_id',),
}


def _is_answer_explanation(module: str, query: Dict[str, Any]) -> bool:
    fields = _ANSWER_FIELDS.get(module, ())
    return bool(fields) and all(str(query.get(f) or '').strip() for f in fields)


def _claim_case_hint(session_doc, exercise_index: int) -> int:
    """
    Atomically counts one hint against this case and returns the new count, or raises HintLimitReached.
    The check and the increment are one conditional update, so parallel requests cannot exceed the cap.
    """
    key = f'case_hints.{exercise_index}'
    doc = GeneratedSessionDocument._get_collection().find_one_and_update(
        {'_id': session_doc.pk, '$or': [{key: {'$exists': False}}, {key: {'$lt': MAX_HINTS_PER_QUESTION}}]},
        {'$inc': {key: 1, 'hints_used': 1}},
        projection={'case_hints': 1},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HintLimitReached()
    return int((doc.get('case_hints') or {}).get(str(exercise_index), 0))


def _log_case_hint(session_doc, exercise_index: int, text: str) -> None:
    """Keeps the served hint so the student can re-read it, including after a page refresh."""
    if text:
        GeneratedSessionDocument._get_collection().update_one(
            {'_id': session_doc.pk}, {'$push': {f'case_hint_log.{exercise_index}': text}})


def _hint_counts(used: int) -> Dict[str, int]:
    return {'hints_used': used, 'hints_remaining': max(0, MAX_HINTS_PER_QUESTION - used),
            'max_hints': MAX_HINTS_PER_QUESTION}


def _get_node_difficulty(node_id: str) -> int:
    try:
        parts = node_id.split('_')
        num = int(parts[-1])
        if num % 3 == 1: return 1
        if num % 3 == 2: return 2
        return 3
    except Exception:
        return 1


_BLOCK_ID_RE = re.compile(r"\bp\d+\b", re.IGNORECASE)


def _tidy_hint(text: Optional[str], max_sentences: int = 3) -> Optional[str]:
    """Plain-text, at most `max_sentences` sentences; None if it leaks card ids (caller falls back)."""
    if not text:
        return None
    t = re.sub(r"[*_#`>]+", "", text)                       # markdown emphasis / headings
    t = re.sub(r"^\s*(?:[-•]|\d+[.)])\s+", "", t, flags=re.MULTILINE)   # list markers
    t = re.sub(r"\s+", " ", t).strip()
    if not t or _BLOCK_ID_RE.search(t):
        return None
    sentences = re.split(r"(?<=[.!?])\s+", t)
    return " ".join(sentences[:max_sentences]).strip()


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
    def _enforce_tap_tiers(exercises: List[Dict[str, Any]], diff: int) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Every Tap Clues case gets exactly its tier's clue count (Basics 2, Intermediate 3, Advanced 4). A case that
        does not match (a stale copy of a bank case, an off-tier AI case) is replaced by the current bank version of
        the same case when there is one, otherwise by an unused bank case of the same tier. Returns the cases and
        whether anything changed.
        """
        bank = {c.get('exercise_id'): c for c in fallback_bank().get('tap_clues', [])}
        used = {ex.get('exercise_id') for ex in exercises}
        out, changed = [], False
        for ex in exercises:
            ok, reason = enforce_tap_clue_count(ex, diff)
            if ok:
                out.append(ex)
                continue
            current = bank.get(ex.get('exercise_id'))
            if not (current and current.get('difficulty') == diff):
                current = next((c for c in bank.values()
                                if c.get('difficulty') == diff and c.get('exercise_id') not in used), None)
            replacement = _prepare('tap_clues', current) if current else None
            if replacement is not None and enforce_tap_clue_count(replacement, diff)[0]:
                logger.warning(f"Tap Clues case {ex.get('exercise_id')} off-tier ({reason}); "
                               f"replaced with {replacement.get('exercise_id')}")
                used.add(replacement.get('exercise_id'))
                out.append(replacement)
            else:
                logger.error(f"Tap Clues case {ex.get('exercise_id')} off-tier and no tier-{diff} replacement")
                enforce_tap_clue_count(ex, None)   # last resort: require only the clues that exist, never soft-lock
                out.append(ex)
            changed = True
        return out, changed

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
                if module == 'tap_clues':
                    # A session saved before a content fix may hold stale or off-tier cases: repair it in place
                    fixed, changed = cls._enforce_tap_tiers(list(existing.exercises), _get_node_difficulty(node_id))
                    if changed:
                        existing.exercises = fixed
                        existing.save()
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

        valid_exercises: List[Dict[str, Any]] = []

        # 2b. Anchor Case 1 with the node's curated canonical default exercise on first take or when not in history
        canonical_case = next((c for c in fallback_bank().get(module, []) if c.get('exercise_id') == f"fb_{node_id}"), None)
        if canonical_case:
            canonical_hash = calculate_question_hash(module, canonical_case)
            if canonical_hash not in past_hashes:
                valid_exercises.append(_prepare(module, canonical_case))
                past_hashes.add(canonical_hash)
                if canonical_case.get('reading_passage'):
                    past_passages.append(canonical_case.get('reading_passage'))

        # 3. Call Gemini AI for dynamic generation with anti-repetition constraints for the remaining cases
        client = GeminiClient()
        system_inst = build_system_instruction()
        needed_count = max(0, EXERCISES_PER_SESSION - len(valid_exercises))
        model_used = ''
        latency_ms = 0

        if needed_count > 0 and client.is_available():
            prompt = build_generation_prompt(
                module=module,
                node_info=node_meta,
                previous_topics=past_topics + [ex.get('topic_title', '') for ex in valid_exercises],
                previous_passages=past_passages,
                count=needed_count,
            )

            generated_raw = client.generate_structured_session(
                module=module,
                system_instruction=system_inst,
                user_prompt=prompt,
            )

            if generated_raw:
                model_used = generated_raw.get('_model_used', '')
                latency_ms = generated_raw.get('_latency_ms', 0)

                if isinstance(generated_raw.get('exercises'), list):
                    for ex in generated_raw['exercises']:
                        if len(valid_exercises) >= EXERCISES_PER_SESSION:
                            break
                        # Module syntactic/structural validation
                        is_valid, reason = validate_module_exercise(module, ex, node_meta['difficulty'])
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
                    is_valid, _ = validate_module_exercise(module, ex, node_meta['difficulty'])
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
            # The pool orders its own tier unseen-first and prefers the node's focus family, so ask only for
            # what is missing: a larger request would pad with other tiers and break tier scaling.
            fallback_items = get_fallback_batch(
                module, diff, count=missing_count, exclude_hashes=past_hashes,
                family=node_family(module, node_id, node_meta.get('craap_criterion')),
            )
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

        # 6a. Tap Clues: every case carries exactly its tier's clue count (2 / 3 / 4), so the screen's
        #     CLUES FOUND x/N and its unlock threshold always agree with the clues actually in the passage
        if module == 'tap_clues':
            valid_exercises, _ = cls._enforce_tap_tiers(valid_exercises, diff)

        # 6b. Guarantee anti-pattern shuffling on all valid exercises
        for ex in valid_exercises:
            if module == 'snap_gap' and isinstance(ex.get('transition_tile_dock'), list):
                random.shuffle(ex['transition_tile_dock'])

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

        is_correct = False
        res: Dict[str, Any] = {}

        if module == 'logic_thread':
            submitted_seq = submission_payload.get('sequence', [])
            correct_seq = ex.get('correct_sequence', [])
            is_correct = (submitted_seq == correct_seq)
            res = {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'is_correct': is_correct,
            }

        elif module == 'snap_gap':
            board_state = submission_payload.get('board_state', {})
            correct_tile_map = ex.get('correct_tile_map', {})

            def norm_tile(tile):
                # Same rule as the frontend: case- and whitespace-insensitive
                return str(tile or '').strip().lower()

            incorrect_pairs = [
                pid for pid, tile in board_state.items()
                if norm_tile(correct_tile_map.get(pid)) != norm_tile(tile)
            ]
            is_correct = (len(incorrect_pairs) == 0 and len(board_state) == len(correct_tile_map))
            res = {
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
            res = {
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
            res = {
                'result': 'correct' if is_correct else 'incorrect',
                'status': 'mastered' if is_correct else 'incomplete',
                'remaining_flawed_ids': remaining_flawed,
                'wrongly_quarantined': wrongly_quarantined,
                'is_correct': is_correct,
            }
        else:
            return {'status': 'error', 'message': f'Unsupported module {module}'}

        # ── 3-attempt credit ────────────────────────────────────────────────
        # `is_correct` above means the answer is right (solved). Credit is separate: a solve counts only within
        # the first 3 attempts. The attempt number is the higher of the server's count and the client's report.
        key = str(exercise_index)
        try:
            client_attempts = max(0, int(submission_payload.get('attempts') or 0))
        except (TypeError, ValueError):
            client_attempts = 0
        solved = bool(is_correct)
        if solved:
            wrongs = int((session_doc.case_attempts or {}).get(key, 0))
            attempts_used = max(wrongs + 1, client_attempts)
        else:
            wrongs = record_wrong_attempt(session_doc, exercise_index)
            attempts_used = max(wrongs, client_attempts)
            session_doc.reload()
        prior = (session_doc.case_results or {}).get(key) or {}
        latched = bool(prior.get('failed_after_three_attempts')) or wrongs >= CREDIT_ATTEMPTS \
            or attempts_used > CREDIT_ATTEMPTS
        credited = solved and not latched
        if prior.get('solved'):
            credited = credited and bool(prior.get('credited'))   # a recorded outcome only ever gets stricter
        if solved or latched:
            outcome = {'attempts': attempts_used, 'solved': solved or bool(prior.get('solved')),
                       'credited': credited, 'failed_after_three_attempts': latched or bool(prior.get('failed_after_three_attempts'))}
            GeneratedSessionDocument._get_collection().update_one(
                {'_id': session_doc.pk}, {'$set': {f'case_results.{key}': outcome}})
        res.update({
            'solved': solved,
            'credited': credited,
            'is_correct': credited,              # graded result: false once 3 attempts have failed
            'attempts': attempts_used,
            'failed_after_three_attempts': latched,
        })

        # A solve advances the docket even without credit, so the cadet can move on
        if solved:
            new_idx = max(session_doc.current_index, exercise_index + 1)
            if new_idx != session_doc.current_index:
                session_doc.current_index = new_idx
                session_doc.save()

        res['current_index'] = session_doc.current_index
        return res

    @classmethod
    def update_session_progress(
        cls,
        session_id: str,
        current_index: int
    ) -> Dict[str, Any]:
        """
        Explicitly updates the progress (current_index) for an active session.
        """
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'status': 'error', 'message': 'Session not found'}

        total = len(session_doc.exercises)
        safe_idx = max(0, min(current_index, total))
        session_doc.current_index = safe_idx
        session_doc.save()

        return {
            'status': 'success',
            'session_id': session_id,
            'current_index': session_doc.current_index,
            'total_exercises': total,
        }

    @classmethod
    def get_live_socratic_hint(
        cls,
        session_id: str,
        exercise_index: int,
        submission_payload: Dict[str, Any],
        error_count: int = 1,
    ) -> Dict[str, Any]:
        """
        "Dig deeper": the next Socratic hint on this case (levels 1-3), passage-specific and more pointed each time.
        Each call counts toward the 3-hint cap; the opening guidance from get_exercise_feedback is free.
        """
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc or exercise_index < 0 or exercise_index >= len(session_doc.exercises):
            return {'socratic_hint': 'Review the passage carefully for key transitions and clues.'}

        level = _claim_case_hint(session_doc, exercise_index)   # 1, 2 or 3; raises HintLimitReached at the cap
        module = session_doc.module
        ex = session_doc.exercises[exercise_index]
        # Offline hint for this level, built from the case and the cadet's board (Snap Gap: the gap they are on)
        baseline = case_hint(module, ex, level, submission_payload if isinstance(submission_payload, dict) else None)

        client = GeminiClient()
        hint = None
        if client.is_available():
            prompt = build_socratic_hint_prompt(
                module=module,
                exercise=ex,
                submission_state=submission_payload,
                error_count=error_count,
                level=level,
                baseline=baseline,
            )
            if module == 'logic_thread':
                # Lower temperature keeps the clue on the cards; card ids in the text send it to the fallback
                hint = _tidy_hint(client.generate_live_socratic_hint(prompt, temperature=0.4))
            else:
                hint = client.generate_live_socratic_hint(prompt)

        text = (hint or '').strip() or baseline
        _log_case_hint(session_doc, exercise_index, text)
        return {'socratic_hint': text, 'hint_level': level, **_hint_counts(level)}

    @classmethod
    def get_exercise_feedback(
        cls,
        session_id: str,
        exercise_index: int,
        feedback_query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Explanation of a wrong answer, or the free opening guidance (level 0) for the current case."""
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'explanation': 'Session not found.', 'hint': '', 'hint_tier': 1}

        if exercise_index < 0 or exercise_index >= len(session_doc.exercises):
            return {'explanation': 'Invalid index.', 'hint': '', 'hint_tier': 1}

        module = session_doc.module
        is_explanation = _is_answer_explanation(module, feedback_query)
        used = int((session_doc.case_hints or {}).get(str(exercise_index), 0))
        ex = session_doc.exercises[exercise_index]
        # Opening guidance (the sidebar lightbulb, or a wrong answer's explanation) is level 0: free and never more
        # than an orientation. Whatever tier a client asks for, deeper hints come only from "Dig deeper".
        hint_text = case_hint(module, ex, 0)
        requested_tier = 0

        # Module-specific error explanations
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

        if is_explanation:
            # A wrong answer's explanation still counts in the session total as before (it feeds XP)
            GeneratedSessionDocument._get_collection().update_one({'_id': session_doc.pk}, {'$inc': {'hints_used': 1}})

        return {
            'explanation': explanation,
            'hint': hint_text,
            'hint_tier': requested_tier,
            **_hint_counts(used),
        }

    @classmethod
    def complete_session(cls, session_id: str, student_id: str, username: str, hints_used: int = 0) -> Dict[str, Any]:
        """Marks the session complete and advances progression in the database."""
        session_doc = GeneratedSessionDocument.objects(session_id=session_id).first()
        if not session_doc:
            return {'status': 'error', 'message': 'Session not found'}

        # A case marked failed (not solved within 3 attempts) means the node is not mastered on this run
        failed = sorted(int(k) + 1 for k, r in (session_doc.case_results or {}).items()
                        if isinstance(r, dict) and r.get('credited') is False)
        if failed:
            return {'status': 'error', 'reason': 'cases_failed', 'failed_cases': failed,
                    'message': f"Not mastered: case(s) {', '.join(map(str, failed))} were not solved within "
                               f"{CREDIT_ATTEMPTS} attempts."}

        session_doc.is_completed = True
        session_doc.save()

        # Check total hints used from session tracking, client parameter, or telemetry
        doc_hints = getattr(session_doc, 'hints_used', 0) or 0
        total_hints = max(int(hints_used or 0), doc_hints)
        if total_hints == 0:
            try:
                from api.scaffold.mongo_models import TelemetryLogDocument
                telem_hints = TelemetryLogDocument.objects(
                    student_id=student_id,
                    node_id=session_doc.node_id,
                    hint_used=True,
                ).count()
                total_hints = max(total_hints, telem_hints)
            except Exception:
                pass

        # Update student progression
        prog_result = ProgressionManagementService.update_progression(
            student_id=student_id,
            node_id=session_doc.node_id,
            username=username,
            hints_used=total_hints,
        )

        return {
            'status': 'mastered',
            'session_id': session_id,
            'node_id': session_doc.node_id,
            'next_node': prog_result.get('next_node'),
            'streak': prog_result.get('streak', 0),
            'streak_new_day': prog_result.get('streak_new_day', False),
            'unlocked_nodes': prog_result.get('unlocked_nodes', []),
            'xp_awarded': prog_result.get('xp_awarded', 0),
            'total_xp': prog_result.get('total_xp', 0),
            'level': prog_result.get('level', 1),
            'level_title': prog_result.get('level_title', ''),
            'level_up': prog_result.get('level_up', False),
            'progress_pct': prog_result.get('progress_pct', 0),
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
            # Per-case hint state, so a refresh keeps the 3-hint cap and the hints already unlocked
            'max_hints_per_question': MAX_HINTS_PER_QUESTION,
            'case_hints': {k: int(v) for k, v in (getattr(session_doc, 'case_hints', None) or {}).items()},
            'case_hint_log': dict(getattr(session_doc, 'case_hint_log', None) or {}),
            # Per-case attempts and graded outcomes, so a refresh keeps the 3-attempt latch
            'case_attempts': {k: int(v) for k, v in (getattr(session_doc, 'case_attempts', None) or {}).items()},
            'case_results': dict(getattr(session_doc, 'case_results', None) or {}),
            'model_used': getattr(session_doc, 'model_used', ''),
        }
