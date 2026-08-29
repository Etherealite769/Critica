# backend/api/ai/schemas.py
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


# ── Shared Sub-Schemas ────────────────────────────────────────

class ScaffoldHintSchema(BaseModel):
    tier: int = Field(..., description="Hint tier 1 (gentle cue), 2 (structural hint), or 3 (direct answer)")
    hint_text: str = Field(..., description="Instructive hint explaining how to reason about the solution")


# ── 1. Logic Thread Schemas ───────────────────────────────────

class ParagraphBlockSchema(BaseModel):
    block_id: str = Field(..., description="Unique block identifier such as 'p1', 'p2', 'p3', 'p4'")
    text: str = Field(..., description="Self-contained sentence or paragraph chunk")
    order: int = Field(..., description="1-indexed target position in logical order")


class LogicThreadExerciseSchema(BaseModel):
    exercise_id: str = Field(..., description="Unique exercise identifier")
    topic_title: str = Field(..., description="Educational topic name (e.g., Deep-Sea Hydrothermal Vents)")
    reading_passage: str = Field(..., description="The complete coherent passage formed by the correctly ordered blocks")
    paragraph_blocks: List[ParagraphBlockSchema] = Field(..., min_length=2, max_length=6, description="List of blocks to be re-ordered")
    correct_sequence: List[str] = Field(..., description="Ordered list of block_ids, e.g. ['p1', 'p2', 'p3']")
    structural_explanations: Dict[str, str] = Field(..., description="Map of incorrect connection pairs like 'p2__p1' to feedback text")
    scaffold_hints: List[ScaffoldHintSchema] = Field(..., min_length=3, max_length=3, description="Hints for tiers 1, 2, and 3")


class LogicThreadSessionBatchSchema(BaseModel):
    exercises: List[LogicThreadExerciseSchema] = Field(..., min_length=1, max_length=5, description="Batch of progressive exercises for the session")


# ── 2. Snap-in Gap Schemas ─────────────────────────────────────

class SentencePairSchema(BaseModel):
    pair_id: str = Field(..., description="Identifier for the pair, e.g. 'pair_1', 'pair_2'")
    sentence_a: str = Field(..., description="The preceding sentence before the transition gap")
    sentence_b: str = Field(..., description="The following sentence after the transition gap")


class SnapGapExerciseSchema(BaseModel):
    exercise_id: str = Field(..., description="Unique exercise identifier")
    topic_title: str = Field(..., description="Educational topic name")
    reading_passage: str = Field(..., description="Combined readable text with the target transitions smoothly inserted")
    sentence_pairs: List[SentencePairSchema] = Field(..., min_length=1, max_length=3, description="Sentence pairs with missing transition links")
    transition_tile_dock: List[str] = Field(..., min_length=3, max_length=6, description="Candidate transition word tiles including distractors")
    correct_tile_map: Dict[str, str] = Field(..., description="Mapping of pair_id to correct transition tile, e.g. {'pair_1': 'However'}")
    tile_error_explanations: Dict[str, str] = Field(..., description="Explanations for incorrect tile choices like 'pair_1__Therefore'")
    scaffold_hints: List[ScaffoldHintSchema] = Field(..., min_length=3, max_length=3, description="Hints for tiers 1, 2, and 3")


class SnapGapSessionBatchSchema(BaseModel):
    exercises: List[SnapGapExerciseSchema] = Field(..., min_length=1, max_length=5, description="Batch of progressive exercises for the session")


# ── 3. Tap the Clues Schemas ───────────────────────────────────

class LockedWordSchema(BaseModel):
    word_id: str = Field(..., description="Identifier for the locked vocabulary word, e.g. 'w1'")
    word: str = Field(..., description="Target vocabulary word to unlock")
    position_index: int = Field(0, description="Word index or order within passage")
    correct_clue_ids: List[str] = Field(..., min_length=1, description="Exact clue words in passage that signal the target word's meaning")
    definition: str = Field(..., description="Clear, student-friendly academic definition")
    contextual_usage: str = Field(..., description="Explanation of how the word operates in this specific context")
    translation: str = Field(..., description="Synonym or core translation phrase")


class TapCluesExerciseSchema(BaseModel):
    exercise_id: str = Field(..., description="Unique exercise identifier")
    topic_title: str = Field(..., description="Educational topic name")
    reading_passage: str = Field(..., description="Context passage containing the locked words and their surrounding clue words")
    locked_words: List[LockedWordSchema] = Field(..., min_length=1, max_length=3, description="Target vocabulary words")
    clue_error_explanations: Dict[str, str] = Field(default_factory=dict, description="Feedback if a student taps an unrelated word")
    scaffold_hints: List[ScaffoldHintSchema] = Field(..., min_length=3, max_length=3, description="Hints for tiers 1, 2, and 3")


class TapCluesSessionBatchSchema(BaseModel):
    exercises: List[TapCluesExerciseSchema] = Field(..., min_length=1, max_length=5, description="Batch of progressive exercises for the session")


# ── 4. Fact Scanner Schemas ────────────────────────────────────

class ArticleSentenceSchema(BaseModel):
    sentence_id: str = Field(..., description="Identifier, e.g. 's1', 's2', 's3', 's4'")
    text: str = Field(..., description="Full text of the sentence")
    is_flawed: bool = Field(..., description="True if sentence violates the CRAAP criterion, False if reliable/valid")
    flaw_reason: str = Field(default="", description="Explanation of the flaw if is_flawed is True, otherwise empty")


class FactScannerExerciseSchema(BaseModel):
    exercise_id: str = Field(..., description="Unique exercise identifier")
    topic_title: str = Field(..., description="Educational topic name")
    craap_criterion: str = Field(..., description="Target CRAAP criterion: 'CURRENCY', 'RELEVANCE', 'AUTHORITY', 'ACCURACY', or 'PURPOSE'")
    reading_passage: str = Field(..., description="Combined article text")
    article_sentences: List[ArticleSentenceSchema] = Field(..., min_length=3, max_length=6, description="Sentences composing the article")
    sentence_explanations: Dict[str, str] = Field(..., description="Explanations for why each sentence is sound or flawed")
    scaffold_hints: List[ScaffoldHintSchema] = Field(..., min_length=3, max_length=3, description="Hints for tiers 1, 2, and 3")


class FactScannerSessionBatchSchema(BaseModel):
    exercises: List[FactScannerExerciseSchema] = Field(..., min_length=1, max_length=5, description="Batch of progressive exercises for the session")
