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
    "Astrobiology and Extremophiles",
    "Bioinformatics and Genomic Sequencing",
    "Renaissance Cryptography and Cipher History",
    "Urban Planning and Sustainable Cities",
    "Meteorology and Extreme Weather Systems",
    "Behavioral Economics and Decision Making",
    "Biomimicry and Nature-Inspired Engineering",
    "Ethnobotany and Indigenous Plant Medicine",
    "Deep-Sea Hydrothermal Vent Ecosystems",
    "Aviation History and Aerodynamics",
    "Conservation Genetics and Rewilding",
    "Paleontology and Fossil Record Discoveries",
    "Optics, Photonics, and Laser Technology",
    "Agricultural Innovation and Hydroponics",
    "Cognitive Linguistics and Metaphor Theory",
    "Glaciology and Polar Ice Cap Dynamics",
    "Quantum Physics and Superconductivity",
    "Microbiology and the Human Microbiome",
    "Comparative Mythology and Folklore Structure",
    "Acoustics and Architectural Sound Design",
]

DIFFICULTY_DESCRIPTORS = {
    1: "Basics / Foundation (Lexile 700-900L / CEFR B1): Clear and direct sentence structures, obvious transitions/clues, high clarity, and concise passages with exactly 3 paragraph blocks to connect in sequence (50-80 words per exercise).",
    2: "Intermediate (Lexile 950-1150L / CEFR B2): Moderate syntactic complexity, multi-step logical linkages, subtle distractors, and standard academic prose with exactly 4 paragraph blocks to connect in sequence (80-120 words per exercise).",
    3: "Advanced (Lexile 1200-1400L+ / CEFR C1): Nuanced academic prose, complex multi-clause sentences, fine distinctions between closely related concepts, and deep comprehension demands with exactly 5 paragraph blocks to connect in sequence (120-170 words per exercise)."
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
        "4. FRESHNESS & ABSOLUTE NOVELTY: Every exercise MUST explore a novel, fascinating scenario. Vary themes, subject matters, and sentence templates. NEVER repeat scenarios or passage text.\n"
        "5. COMPREHENSIVE EXPLANATIONS: Provide educational, encouraging explanations for all common distractor errors and 3-tiered scaffold hints.\n"
        "6. OUTPUT FORMAT: Output valid, structured JSON adhering strictly to the requested schema."
    )


def select_novel_domains(previous_topics: Optional[List[str]], count: int) -> List[str]:
    """Selects domains that have not been recently covered by the student."""
    past_text = " ".join(previous_topics or []).lower()
    candidate_domains = [
        d for d in EDUCATIONAL_DOMAINS
        if not any(word in past_text for word in d.lower().split() if len(word) > 4)
    ]
    if len(candidate_domains) < count:
        candidate_domains = list(EDUCATIONAL_DOMAINS)
    return random.sample(candidate_domains, min(count, len(candidate_domains)))


def build_generation_prompt(
    module: str,
    node_info: Dict[str, Any],
    previous_topics: Optional[List[str]] = None,
    previous_passages: Optional[List[str]] = None,
    count: int = 5,
) -> str:
    """
    Builds the detailed user prompt for Gemini to generate a batch of progressive, non-repeating exercises.
    """
    node_id = node_info.get('node_id', '')
    title = node_info.get('title', 'Reading Competency')
    focus = node_info.get('focus', 'Mastery of target reading skill')
    micro_lesson = node_info.get('micro_lesson_text', '')
    difficulty = node_info.get('difficulty', 1)
    diff_desc = DIFFICULTY_DESCRIPTORS.get(difficulty, DIFFICULTY_DESCRIPTORS[1])

    selected_domains = select_novel_domains(previous_topics, count)

    negatives = ""
    if previous_topics or previous_passages:
        cleaned_topics = [t.strip() for t in (previous_topics or []) if t.strip()][:25]
        neg_items = [f"- Topic: {t}" for t in cleaned_topics]
        if neg_items:
            negatives = (
                "\n\n[STRICT NEGATIVE CONSTRAINTS - PREVIOUSLY ENCOUNTERED BY STUDENT]:\n"
                "The student has previously attempted exercises on the following scenarios:\n"
                + "\n".join(neg_items) + "\n"
                "CRITICAL: DO NOT reuse, rephrase, or closely mimic any of the above topics, scenarios, or passages. "
                "You MUST generate 100% fresh, novel subject matter and unique sentence structures."
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
Generate a progressive batch of exactly {count} distinct, completely novel educational exercises for this node attempt.
Assigned target domains for this session: {', '.join(selected_domains)}.
{negatives}
"""

    if module == 'logic_thread':
        block_count = 3 if difficulty == 1 else (4 if difficulty == 2 else 5)
        prompt += f"""
[LOGIC THREAD SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title for the passage topic.
2. `reading_passage`: The full, cohesive paragraph when read in correct sequence.
3. `paragraph_blocks`: Exactly {block_count} blocks ('p1', 'p2', ... up to 'p{block_count}'). Each block must be a distinct, self-contained sentence or segment.
4. `correct_sequence`: The exact ordered list of block_ids (e.g. {['p' + str(i+1) for i in range(block_count)]}).
5. `structural_explanations`: Explanations for why invalid pairings fail (e.g., 'p2__p1': 'Chronological/causal dependency requires p1 first').
6. `scaffold_hints`: Exactly 3 hints (tier 1: gentle cue, tier 2: structural signal word pointer, tier 3: explicit sequence step).
"""

    elif module == 'snap_gap':
        pair_count = 1 if difficulty == 1 else 2
        prompt += f"""
[SNAP-IN GAP SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: The complete passage with transitions smoothly inserted.
3. `sentence_pairs`: Exactly {pair_count} sentence pairs ('pair_1', etc.) where sentence_b logically continues from sentence_a via a transition word.
4. `transition_tile_dock`: A list of 4-5 transition words containing the correct transition(s) plus plausible distractors (e.g. ['Furthermore', 'However', 'Therefore', 'In contrast']).
5. `correct_tile_map`: Dict mapping each pair_id to its correct transition tile from the dock (e.g. {{'pair_1': 'However'}}).
6. `tile_error_explanations`: Explanations for why each distractor is incorrect for the pair (e.g. 'pair_1__Therefore': 'Therefore indicates a cause-and-effect relationship, but sentence B presents an opposing contrast.').
7. `scaffold_hints`: Exactly 3 hints (tier 1, 2, 3).
"""

    elif module == 'tap_clues':
        prompt += f"""
[TAP THE CLUES SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: A rich, 2-3 sentence passage containing 1 target academic vocabulary word and clear contextual clue words.
3. `locked_words`: A list containing 1 locked word object.
   - `word`: The target word found verbatim in the passage.
   - `correct_clue_ids`: 1-2 exact clue words or phrases present in the reading passage that reveal the word's meaning.
   - `definition`: A concise, academic definition.
   - `contextual_usage`: How the word functions in this passage.
   - `translation`: Direct synonym.
4. `clue_error_explanations`: Feedback explaining why non-clue words do not help define the locked word.
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

    prompt += "\nEnsure all exercises are returned in the root `exercises` list adhering strictly to the JSON schema."
    return prompt


def build_socratic_hint_prompt(
    module: str,
    exercise: Dict[str, Any],
    submission_state: Dict[str, Any],
    error_count: int = 1,
) -> str:
    """
    Builds a prompt for generating dynamic, on-demand Socratic pedagogical advice.
    """
    passage = exercise.get('reading_passage', '')
    title = exercise.get('topic_title', 'Exercise')

    return f"""You are Agent Crit, the Socratic Reading Detective and pedagogical coach in CRITICA.
A student is working on the following reading exercise in {module.upper()} and made an incorrect attempt (Attempt #{error_count}).

[EXERCISE TOPIC]: {title}
[READING PASSAGE]:
\"\"\"{passage}\"\"\"

[STUDENT SUBMISSION STATE]:
{submission_state}

[TASK]:
Provide a concise (2-3 sentences), encouraging, Socratic hint that guides the student's thinking without giving away the direct answer.
Point them toward key sentence clues, transition signals, or criterion questions to help them uncover the solution themselves.
Tone: Detective instructor, encouraging, intellectually engaging.
"""
