# backend/api/ai/prompt_builder.py
import random
from typing import List, Dict, Any, Optional

EDUCATIONAL_DOMAINS = [
    "Marine Biology and Oceanography",
    "Space Exploration and Astrophysics",
    "Ancient Civilizations and Archaeology",
    "Cognitive Neuroscience and Psychology",
    "Renewable Energy and Clean Technology",
    "Environmental Ecology and Biodiversity",
    "Architectural Engineering and Design",
    "Linguistics and the History of Writing",
    "Material Science and Nanotechnology",
    "Public Health and Epidemiology",
    "Robotics and Artificial Intelligence Ethics",
    "Geology and Volcanology",
]

DIFFICULTY_DESCRIPTORS = {
    1: "Basics / Foundation: Clear and direct sentence structures, obvious transitions/clues, high clarity, and concise passages (40-70 words per exercise).",
    2: "Intermediate: Moderate syntactic complexity, multi-step logical linkages, subtle distractors, and standard academic prose (70-110 words per exercise).",
    3: "Advanced: Nuanced academic prose, complex multi-clause sentences, fine distinctions between closely related concepts, and deep comprehension demands (100-150 words per exercise)."
}


def build_system_instruction() -> str:
    return (
        "You are the Core Pedagogical Engine for CRITICA, an advanced reading comprehension and critical "
        "thinking academy. Your goal is to dynamically generate educational exercises that strictly teach "
        "and test specific reading competencies.\n\n"
        "CORE RULES:\n"
        "1. STRICT GROUNDING: Every correct answer, clue, and explanation MUST be 100% supported by the text and lesson rules. Do NOT require outside trivia.\n"
        "2. ACCURACY & QUALITY: Avoid ambiguity. There must be exactly ONE unambiguously correct answer/sequence.\n"
        "3. PLAUSIBLE DISTRACTORS: Incorrect options and distractors must be grammatically plausible but clearly flawed based on the lesson principles.\n"
        "4. FRESHNESS & DIVERSITY: Explore novel, fascinating academic scenarios. Vary themes and avoid repetitive sentence templates.\n"
        "5. OUTPUT FORMAT: Output valid, structured JSON adhering strictly to the requested schema."
    )


def build_generation_prompt(
    module: str,
    node_info: Dict[str, Any],
    previous_topics: Optional[List[str]] = None,
    count: int = 5,
) -> str:
    """
    Builds the detailed user prompt for Gemini to generate a batch of progressive exercises.
    """
    node_id = node_info.get('node_id', '')
    title = node_info.get('title', 'Reading Competency')
    focus = node_info.get('focus', 'Mastery of target reading skill')
    micro_lesson = node_info.get('micro_lesson_text', '')
    difficulty = node_info.get('difficulty', 1)
    diff_desc = DIFFICULTY_DESCRIPTORS.get(difficulty, DIFFICULTY_DESCRIPTORS[1])
    
    selected_domains = random.sample(EDUCATIONAL_DOMAINS, min(count, len(EDUCATIONAL_DOMAINS)))
    
    negatives = ""
    if previous_topics:
        cleaned_topics = [t.strip() for t in previous_topics if t.strip()][:15]
        if cleaned_topics:
            negatives = (
                "\n\n[NEGATIVE CONSTRAINTS - PREVIOUSLY COVERED TOPICS]:\n"
                "The student has already encountered exercises on the following topics:\n"
                "- " + "\n- ".join(cleaned_topics) + "\n"
                "DO NOT reuse or closely mimic these topics or scenarios. Generate completely fresh subject matter."
            )

    prompt = f"""[CRITICA MODULE]: {module.upper()}
[NODE METADATA]:
- Node ID: {node_id}
- Title: {title}
- Focus: {focus}
- Difficulty Level: Tier {difficulty} ({diff_desc})

[MICRO-LESSON THEORY & PEDAGOGICAL SCOPE]:
\"\"\"{micro_lesson}\"\"\"

[TASK]:
Generate a progressive batch of exactly {count} distinct educational exercises for this node attempt.
Recommended domains for this session: {', '.join(selected_domains)}.
{negatives}
"""

    if module == 'logic_thread':
        prompt += f"""
[LOGIC THREAD SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title for the passage topic.
2. `reading_passage`: The full, cohesive paragraph when read in correct sequence.
3. `paragraph_blocks`: Exactly {2 if difficulty == 1 else (3 if difficulty == 2 else 4)} blocks ('p1', 'p2', ...). Each block must be a distinct, self-contained sentence or segment.
4. `correct_sequence`: The exact ordered list of block_ids (e.g. ['p1', 'p2', 'p3']).
5. `structural_explanations`: A dictionary explaining why wrong pairings fail (e.g., 'p2__p1': 'Explanation of chronological/causal dependency').
6. `scaffold_hints`: Exactly 3 hints (tier 1: general cue, tier 2: structural signal, tier 3: explicit sequence).
"""

    elif module == 'snap_gap':
        prompt += f"""
[SNAP-IN GAP SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: The complete passage with transitions smoothly inserted.
3. `sentence_pairs`: Exactly {1 if difficulty == 1 else 2} sentence pairs ('pair_1', etc.) where sentence_b logically continues from sentence_a via a transition word.
4. `transition_tile_dock`: A list of 4-5 transition words containing the correct transition(s) plus plausible distractors (e.g. ['Furthermore', 'However', 'Therefore', 'In contrast']).
5. `correct_tile_map`: Dict mapping each pair_id to its correct transition tile from the dock (e.g. {{'pair_1': 'However'}}).
6. `tile_error_explanations`: Explanations for why each distractor is incorrect for the pair (e.g. 'pair_1__Therefore': '...').
7. `scaffold_hints`: Exactly 3 hints (tier 1, 2, 3).
"""

    elif module == 'tap_clues':
        prompt += f"""
[TAP THE CLUES SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: A rich, 2-3 sentence passage containing 1 target advanced vocabulary word and clear contextual clue words.
3. `locked_words`: A list containing 1 locked word object.
   - `word`: The target word found verbatim in the passage.
   - `correct_clue_ids`: 1-2 exact clue words or phrases present in the reading passage that reveal the word's meaning.
   - `definition`: A concise, academic definition.
   - `contextual_usage`: How the word functions in this passage.
   - `translation`: Direct synonym.
4. `clue_error_explanations`: Feedback for plausible non-clue words.
5. `scaffold_hints`: Exactly 3 hints (tier 1, 2, 3).
"""

    elif module == 'fact_scanner':
        craap = node_info.get('craap_criterion', 'CURRENCY')
        prompt += f"""
[FACT SCANNER SPECIFIC REQUIREMENTS]:
- Target CRAAP Criterion: {craap}
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `craap_criterion`: '{craap}'
3. `reading_passage`: A 4-5 sentence short article.
4. `article_sentences`: Exactly 4-5 sentence objects ('s1', 's2', 's3', 's4').
   - Exactly 1 or 2 sentences must have `is_flawed: true` (a clear violation of the {craap} criterion, e.g. using a 1980s source for modern tech if Currency, or anonymous blogs for medical advice if Authority).
   - The remaining sentences must have `is_flawed: false`.
   - `flaw_reason`: Clear explanation of the violation if flawed, empty string if sound.
5. `sentence_explanations`: Dict explaining why each sentence is sound or flawed.
6. `scaffold_hints`: Exactly 3 hints (tier 1, 2, 3).
"""

    prompt += "\nEnsure all exercises are returned in the root `exercises` list."
    return prompt
