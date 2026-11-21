# backend/api/ai/prompt_builder.py
import random

from .validators import TAP_CLUES_PER_TIER
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

# Every tier is pitched at Grade 11 Senior High School (Philippine DepEd SHS Reading and Writing / EAPP).
# The tiers scale WITHIN that grade: Basics is Grade 11 entry level, never elementary.
GRADE_11_STANDARD = (
    "Grade 11 Senior High School critical reading (Philippine DepEd SHS Reading and Writing Skills / "
    "English for Academic and Professional Purposes). Prose is authentic expository, scientific, historical "
    "or journalistic writing of the kind found in SHS textbooks, science features and quality newspapers. "
    "Never write for elementary or junior high readers: no cartoon scenarios, no household chores or recipes, "
    "no one-clause 'The cat sat' sentences."
)

DIFFICULTY_DESCRIPTORS = {
    1: "Basics / Grade 11 entry level (Lexile 1000-1150L / CEFR B2): accessible but authentic SHS informational prose, "
       "2-3 sentences per passage or card set, explicit structural signals the node's lesson teaches, and plausible distractors "
       "that can only be ruled out by reading the whole passage, never by spotting one buzzword.",
    2: "Intermediate / Grade 11 standard (Lexile 1150-1300L / CEFR B2+-C1): denser academic, scientific or journalistic prose "
       "(3-4 sentences), fewer surface keywords, and near-miss distractors that differ from the answer in one precise logical "
       "or semantic respect.",
    3: "Advanced / Grade 11 honors, college-prep (Lexile 1300-1450L / CEFR C1): complex multi-clause academic argument with "
       "implicit cohesion (reference words, ellipsis, parallel structure), Tier-2/Tier-3 academic vocabulary, minimal "
       "starter-word crutches, and answers that require fine discrimination between closely related options.",
}

# Tier calibration per module: what Basics, Intermediate and Advanced must look like in this module.
MODULE_TIER_RULES = {
    'logic_thread': {
        1: "Cards carry explicit time-order, definition, comparison or causal markers (e.g. 'By the 1890s', 'This process', "
           "'In contrast', 'As a result'), but at least one card must be placed by its content, not by a marker. "
           "No recipes, chores or 'First... Then... Finally' lists.",
        2: "Only some cards open with a transition. The rest are placed through pronoun and noun antecedents "
           "('this shift', 'such deposits', 'the latter') and the conceptual flow from claim to support. Include one "
           "card that looks like an opener (a general statement) but actually depends on an earlier card.",
        3: "At most one card may open with an explicit transition word. Order is fixed by implicit referential cohesion "
           "(demonstratives, synonyms that rename an earlier noun, a term defined before it is used), by given-new "
           "information flow, and by the argument's logic (claim -> mechanism -> qualification -> implication).",
    },
    'snap_gap': {
        1: "One clearly defined logical relation between Exhibit A and Exhibit B. Distractors come from other "
           "relation families (e.g. contrast vs. addition vs. cause) and are each wrong for a reason the "
           "student can state.",
        2: "Include at least one NEAR-MISS distractor from the same broad family as the answer, e.g. concession "
           "('Nonetheless') vs. direct contrast ('In contrast'), result ('Consequently') vs. inference ('Thus'), "
           "addition ('Moreover') vs. exemplification ('For instance'). The sentence content must decide between them.",
        3: "Both pairs need fine discrimination: the dock holds two or more near-misses per pair, and Exhibit A/B "
           "are multi-clause academic sentences whose relation (e.g. concession, corrective contrast, consequence "
           "vs. summary) is implicit in their content rather than signalled by obvious opposite words.",
    },
    'tap_clues': {
        1: "Accessible Tier-2 academic word suitable for Grade 11 beginners (e.g. 'meticulous', 'arid', 'frugal', 'lethargic', "
           "'novel', 'candid', 'scarce', 'abundant', 'perilous', 'diligent', 'fragile', 'somber'). NEVER use obscure, archaic, "
           "or advanced GRE words (such as 'diaphanous', 'quiescent', 'efficacious', 'recalcitrant', 'equivocal', 'ephemeral', 'viscous') "
           "for Basics! The clue is explicit and of the node's type (synonym, definition, antonym or example) but NOT an appositive "
           "handout like 'X, or Y,' or 'X, meaning Y': the clue sits in a separate clause or sentence.",
        2: "Standard Grade 11 Tier-2/Tier-3 word in denser prose (e.g. 'frugal', 'symbiosis', 'transient', 'versatile'). "
           "The meaning must be synthesised from exactly 3 clue words spread across clauses or sentences; at least one plausible non-clue word "
           "(a topic word near the target) must be present as a trap.",
        3: "Advanced Tier-3 or less frequent Tier-2 word (e.g. 'recalcitrant', 'equivocal', 'ephemeral', 'attrition'). Clues are layered "
           "and partly implicit: an example plus a contrast, or a consequence the reader must interpret. No clue "
           "word may be a direct dictionary synonym placed beside the target.",
    },
    'fact_scanner': {
        1: "One clearly verifiable violation of the criterion, written realistically (e.g. CURRENCY: a figure from a "
           "study published before a widely reported revision; AUTHORITY: a claim attributed to an unnamed viral post). "
           "No cartoonish errors like '1952 textbooks' for smartphones or insults.",
        2: "The flaw is subtle: a credentialed source speaking outside their field, an advocacy group's own study, "
           "a relevant-sounding but off-scope statistic, or a correlation quietly presented as cause. The sound "
           "statements must be equally specific so the flaw does not stand out by tone.",
        3: "The flaw is methodological or statistical and requires inference: cherry-picked time windows, "
           "relative-risk figures without base rates, survivorship or self-selection in a sample, data superseded by "
           "a later revision, or disguised commercial sponsorship. Sound statements cite plausible, verifiable sources.",
    },
}


def _tier_rules(module: str, difficulty: int) -> str:
    rule = MODULE_TIER_RULES.get(module, {}).get(difficulty, '')
    return f"\n[TIER CALIBRATION - {['', 'BASICS', 'INTERMEDIATE', 'ADVANCED'][difficulty]}]:\n- {rule}\n" if rule else ''


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
        "6. OUTPUT FORMAT: Output valid, structured JSON adhering strictly to the requested schema.\n"
        f"7. READING LEVEL: Every exercise targets {GRADE_11_STANDARD} Scale difficulty only within that grade, "
        "exactly as the node's tier calibration describes."
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
    if difficulty not in DIFFICULTY_DESCRIPTORS:
        difficulty = 1
    diff_desc = DIFFICULTY_DESCRIPTORS[difficulty]

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
- Reading Standard: {GRADE_11_STANDARD}
{_tier_rules(module, difficulty)}
[MICRO-LESSON THEORY & PEDAGOGICAL SCOPE]:
\"\"\"{micro_lesson}\"\"\"

[TASK]:
Generate a progressive batch of exactly {count} distinct, completely novel educational exercises for this node attempt.
Assigned target domains for this session: {', '.join(selected_domains)}.
{negatives}
"""

    if module == 'logic_thread':
        block_count = 3 if difficulty == 1 else (4 if difficulty == 2 else 5)
        # Determine text structure genre from node_id or focus
        genre_directive = ""
        n_id = node_id.lower()
        if "log_node_01" in n_id or "log_node_02" in n_id or "log_node_03" in n_id or "narration" in focus.lower():
            genre_directive = """
- TARGET GENRE: NARRATION & CHRONOLOGY
- DIVERSIFY PATTERNS ACROSS EXERCISES:
  * Exercise 1: Step-by-step experimental or technological execution sequence.
  * Exercise 2: Historical milestone progression with temporal markers (e.g., Initially, Concurrently, Ultimately).
  * Exercise 3: Natural phenomenon cycle or biological event timeline.
  * Exercise 4: Cause-driven narrative where an initial trigger unleashes subsequent developments.
  * Exercise 5: Problem discovery leading to investigation and final resolution.
- DO NOT use the same opening words (e.g., 'First', 'In the beginning') across exercises."""
        elif "log_node_04" in n_id or "log_node_05" in n_id or "log_node_06" in n_id or "definition" in focus.lower():
            genre_directive = """
- TARGET GENRE: DEFINITION & ELABORATION
- DIVERSIFY PATTERNS ACROSS EXERCISES:
  * Exercise 1: Formal term-class-differentia classification (category -> primary distinction -> unique function).
  * Exercise 2: Operational definition with specific environmental or physical boundary conditions.
  * Exercise 3: Extended anatomical/structural definition detailing physical mechanisms and components.
  * Exercise 4: Contrastive definition (defining an elusive phenomenon by explicitly distinguishing it from commonly confused concepts).
  * Exercise 5: Applied definition showing a theoretical concept manifest in real-world phenomena."""
        elif "log_node_07" in n_id or "log_node_08" in n_id or "log_node_09" in n_id or "comparison" in focus.lower():
            genre_directive = """
- TARGET GENRE: COMPARISON & CONTRAST
- DIVERSIFY PATTERNS ACROSS EXERCISES:
  * Exercise 1: Point-by-point alternating comparison across specific functional criteria.
  * Exercise 2: Block comparison (entity A fully characterized, then entity B contrasted).
  * Exercise 3: Shared evolutionary/structural baseline leading to a sharp functional divergence.
  * Exercise 4: Contrastive pivot architecture ('While subject A operates under X, subject B counters with Y').
  * Exercise 5: Trade-off analysis evaluating the complementary strengths and limitations of two systems."""
        elif "log_node_10" in n_id or "log_node_11" in n_id or "log_node_12" in n_id or "cause" in focus.lower():
            genre_directive = """
- TARGET GENRE: CAUSE & EFFECT
- DIVERSIFY PATTERNS ACROSS EXERCISES:
  * Exercise 1: Direct linear causal chain (Factor A triggers Reaction B, producing Outcome C).
  * Exercise 2: Converging multi-factor causation (two independent conditions combine to produce a threshold event).
  * Exercise 3: Cascading domino effect (an initial disruption produces wide collateral systemic impacts).
  * Exercise 4: Negative feedback loop or self-limiting causal mechanism.
  * Exercise 5: Problem-action-consequence dynamic in ecological or engineering systems."""

        prompt += f"""
[LOGIC THREAD SPECIFIC REQUIREMENTS]:
{genre_directive}

[CRITICAL FORMAT & FIT CONSTRAINTS]:
1. `topic_title`: A distinct, descriptive title for the passage topic.
2. `reading_passage`: The full, cohesive paragraph when read in correct sequence.
3. `paragraph_blocks`: Exactly {block_count} blocks ('p1', 'p2', ... up to 'p{block_count}').
   - BOX FIT RULE: Each block MUST be a single, self-contained sentence between 10 and 22 words (STRICT MAXIMUM of 130 characters per block).
   - Never write bloated sentences that exceed 130 characters, as they will be clipped on bulletin cards.
   - Blocks should be provided in a scrambled order in the paragraph_blocks list (not pre-sorted).
4. `correct_sequence`: The exact ordered list of block_ids (e.g. ['p2', 'p1', 'p3'] or appropriate sequence).
   - SEQUENCE VARIETY RULE: Across the {count} exercises, vary the correct_sequence unpredictably (e.g., ['p2', 'p1', 'p3'], ['p3', 'p2', 'p1'], ['p1', 'p3', 'p2']). Never generate consecutive exercises with identical sequence patterns, and never default to chronological order 'p1, p2, p3'.
5. `structural_explanations`: Explanations for why invalid pairings fail (e.g., 'p2__p1': 'Chronological dependency requires p1 first').
6. `scaffold_hints`: Exactly 3 Socratic hints, each 1-2 sentences and at most 35 words, written as Inspector Crit coaching a cadet:
   - tier 1: a guiding question about what kind of signal to look for (e.g. which event could only happen first?).
   - tier 2: point to ONE signal that appears in the cards (quote it): a transition word (e.g. "meanwhile", "as a result") or, when the cards rely on implicit cohesion, a reference word or phrase (e.g. "this shift", "such deposits", "the latter") and what it implies about position.
   - tier 3: identify which card opens OR which card closes the chain by quoting its first few words. Never state the full order or any block ids.
7. SYNTACTIC VARIETY: Forbid repeating opening phrases, cloned sentence structures, or identical transition markers across exercises in this batch.
8. UNAMBIGUOUS ORDER: Exactly one order must be defensible. Before finalising, check that no two cards could swap places without breaking a reference, a time marker, or the claim-to-support flow.
"""

    elif module == 'snap_gap':
        pair_count = 1 if difficulty == 1 else 2
        # Determine transition genre
        n_id = node_id.lower()
        if "snp_node_01" in n_id or "snp_node_02" in n_id or "snp_node_03" in n_id or "addition" in focus.lower() or "sequence" in focus.lower():
            dock_guidance = "Focus on addition markers (e.g., 'Furthermore', 'Moreover', 'Additionally', 'In addition') or sequence markers (e.g., 'Subsequently', 'Meanwhile', 'Prior to this'). Distractors should be drawn from contrast ('However') and cause-and-effect ('Therefore')."
        elif "snp_node_04" in n_id or "snp_node_05" in n_id or "snp_node_06" in n_id or "contrast" in focus.lower():
            dock_guidance = "Focus on contrast/concession markers (e.g., 'However', 'Conversely', 'In contrast', 'Nonetheless', 'On the other hand'). Distractors should be drawn from addition ('Furthermore') and cause-and-effect ('Therefore')."
        elif "snp_node_07" in n_id or "snp_node_08" in n_id or "snp_node_09" in n_id or "cause" in focus.lower():
            dock_guidance = "Focus on cause-and-effect markers (e.g., 'Therefore', 'Consequently', 'As a result', 'Thus', 'Accordingly'). Distractors should be drawn from contrast ('However') and addition ('Moreover')."
        elif "snp_node_10" in n_id or "snp_node_11" in n_id or "snp_node_12" in n_id or "conclusion" in focus.lower():
            dock_guidance = "Focus on conclusion and summary markers (e.g., 'In conclusion', 'Overall', 'In short', 'Ultimately', 'On balance'). Sentence B must genuinely sum up or close the reasoning in sentence A. Distractors should be drawn from addition ('Moreover'), contrast ('However') and exemplification ('For instance')."
        else:
            dock_guidance = "Candidate tiles should include the target transition plus grammatically plausible but logically opposing distractors."
        if difficulty >= 2:
            dock_guidance += (" At this tier the dock MUST also contain near-miss tiles from the answer's own family "
                              "(e.g. 'Nonetheless' vs. 'In contrast', 'Consequently' vs. 'Thus', 'In short' vs. "
                              "'Ultimately'); the content of the two sentences must rule each one out.")

        prompt += f"""
[SNAP-IN GAP SPECIFIC REQUIREMENTS]:
Target transition focus: {dock_guidance}

For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: The complete passage with transitions smoothly inserted.
3. `sentence_pairs`: Exactly {pair_count} sentence pairs ('pair_1', etc.):
   - `sentence_a`: A complete, grammatically sound sentence ending with a period.
   - `sentence_b`: A complete, grammatically sound sentence that logically continues from sentence_a via the missing transition.
   - CRITICAL GRAMMAR & SPOILER RULE: Do NOT include the transition word in `sentence_b`! `sentence_b` MUST begin with a capitalized first letter as an independent sentence (e.g., 'They install specialized wood paneling...', NOT 'it provided...' and NEVER 'Furthermore, they install...').
4. `transition_tile_dock`: A list of 4-5 transition words containing the correct transition(s) plus plausible distractors. Ensure all words are correctly spelled (e.g. 'Conversely', NEVER 'Conversly').
   - DOCK SHUFFLE RULE: Scramble and randomly distribute the tiles in this list. NEVER put the correct tile for pair 1 in the first slot or pair 2 in the second slot. The order of correct answers in the dock must vary unpredictably across every exercise.
5. `correct_tile_map`: Dict mapping each pair_id to its correct transition tile from the dock (e.g. {{'pair_1': 'Furthermore'}}).
6. `tile_error_explanations`: Dict providing a clear, 1-sentence explanation for why each distractor is incorrect for the pair (e.g. 'pair_1__However': 'However indicates contrast, but sentence B adds another supporting point.'). Every distractor for every pair MUST have an entry. For a near-miss tile, name the precise difference (e.g. 'Nonetheless concedes a point against the claim, but sentence B simply describes the opposite case').
7. `scaffold_hints`: Exactly 3 hints (tier 1: logical relation cue, tier 2: signal word guidance, tier 3: explicit answer reveal).
8. EXACTLY ONE FIT: For each pair, only one tile in the dock may produce a logically correct passage. If two tiles could both work, rewrite the sentences or replace the distractor.
"""

    elif module == 'tap_clues':
        tap_clue_count = TAP_CLUES_PER_TIER.get(difficulty, 2)
        prompt += f"""
[TAP THE CLUES SPECIFIC REQUIREMENTS]:
For each of the {count} exercises:
1. `topic_title`: A distinct, descriptive title.
2. `reading_passage`: A {'2-3' if difficulty == 1 else ('3-4' if difficulty == 2 else '3-5')} sentence Grade 11 passage containing 1 target academic vocabulary word and the context clues the node's focus teaches.
   - CLUE POSITION VARIETY RULE: Vary the distance and position of context clues relative to the locked word. Some clues should appear before the target word, some after, and some in an adjacent sentence.
   - NO HANDOUTS: Never write 'word, or synonym,' / 'word, meaning synonym' / 'word (synonym)' appositives. The clue must be connected to the word through the sentence's logic.
3. `locked_words`: A list containing 1 locked word object.
   - `word`: The target word, copied verbatim (same spelling and inflection) from the passage, as ONE word with no punctuation. It must appear EXACTLY ONCE in the passage.
   - `position_index`: 0-based index of the target in the passage split on whitespace (punctuation stays attached to its word). It is recomputed by the server, but be accurate.
   - `correct_clue_ids`: EXACTLY {tap_clue_count} distinct context clues for this tier (Basics 2, Intermediate 3, Advanced 4). Each is ONE word copied verbatim from the passage (no phrases, no function words like "the" or "was", never the locked word or a word containing it) that defines, restates, exemplifies, or contrasts the locked word.
     Write the passage so these {tap_clue_count} words are the ONLY words that directly reveal the meaning: avoid extra synonyms or descriptions a student could reasonably tap as a clue.
   - `definition`: A concise, academic definition.
   - `contextual_usage`: How the word functions in this passage.
   - `translation`: Direct synonym.
4. `clue_error_explanations`: Feedback keyed 'w1__<word>' explaining why tempting non-clue words (especially the topic words next to the target) do not define the locked word.
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
3. `reading_passage`: A 4-sentence short article written as realistic Grade 11 journalistic or research-summary prose.
4. `article_sentences`: Exactly 4 sentence objects ('s1', 's2', 's3', 's4'), the four witness statements.
   - {'Exactly 1 sentence' if difficulty < 3 else 'Exactly 1 or 2 sentences'} must have `is_flawed: true`: a {'clearly verifiable' if difficulty == 1 else 'subtle'} violation of the {craap} criterion as the tier calibration describes.
   - The remaining sentences must have `is_flawed: false` and be just as specific and realistic (named institutions, years, figures), so the flaw cannot be spotted by tone alone.
   - `flaw_reason`: Clear explanation of the violation if flawed, empty string if sound.
   - POSITION VARIETY RULE: Across the {count} exercises in this batch, dynamically vary WHICH sentence ID is flawed (e.g., Ex 1 has 's2' flawed, Ex 2 has 's4' flawed, Ex 3 has 's1' flawed, Ex 4 has 's3' flawed, Ex 5 has 's2' flawed). NEVER place the flaw in 's3' repeatedly.
5. `sentence_explanations`: Dict explaining why each sentence is sound or flawed.
6. `scaffold_hints`: Exactly 3 hints (tier 1, 2, 3).
"""

    prompt += "\nEnsure all exercises are returned in the root `exercises` list adhering strictly to the JSON schema."
    return prompt


# Shared output rules for live hints: short, plain, Socratic, never the answer
SOCRATIC_OUTPUT_RULES = """[OUTPUT RULES]:
- 2 or 3 short sentences, at most 50 words in total, written for a Grade 11 student. Plain text only: no markdown,
  lists, headings or emojis.
- Each level must be EASIER to act on than the one before: clearer and more concrete, never more abstract or wordy.
- Ground every hint in THIS case: quote only short phrases (a few words) that actually appear on the board. Never
  use stock examples (such as "first", "then", "meanwhile", "finally") unless those exact words appear in the case.
- Never reveal block ids (like p1, p2).
- Speak as Inspector Crit to a cadet: warm, sharp, encouraging. Do not greet or sign off."""

# The hint gradient. The free opening nudge (level 0) is built offline; these are the "Dig deeper" levels, each one
# easier to act on than the last.
_DIG_LEVELS = {
    'logic_thread': {
        1: "SPECIFIC CLUE: point to the one phrase on a card (a reference word like \"this\"/\"such\", a time marker or a "
           "causal phrase) that unlocks the chain, and ask which card it points back to. Do not give the order.",
        2: "ELIMINATE: rule out one or two wrong links, quoting the first words of the cards involved and saying in plain "
           "words why each link breaks.",
        3: "WALKTHROUGH: give the full order by quoting each card's first few words, and say in one sentence why each card "
           "follows the one before it.",
    },
    'snap_gap': {
        1: "SPECIFIC CLUE: quote the key words of Exhibit B and ask one plain question about its job (adds a point, "
           "contrasts, results, gives an example, sums up). Do not name a tile.",
        2: "ELIMINATE: rule out one or two wrong tiles by name and say why each does not fit these two exhibits, leaving "
           "the correct tile and its closest rival as the final two.",
        3: "WALKTHROUGH: name the correct tile, explain in plain words the exact link it makes between A and B, and say "
           "why the closest rival tile is the trap.",
    },
    'tap_clues': {
        1: "SPECIFIC CLUE: quote the short phrase that holds a clue and ask what it tells the cadet about the locked word. "
           "Do not list all the clue words.",
        2: "ELIMINATE: rule out one or two tempting words that are NOT clues (topic words near the locked word) and say why.",
        3: "WALKTHROUGH: name the clue words and explain in one sentence how together they reveal the meaning.",
    },
    'fact_scanner': {
        1: "SPECIFIC CLUE: point to the exact detail (a date, a source, a figure, a sponsor, a loaded word) that the "
           "active CRAAP criterion turns on, and ask whether it passes. Do not name the statement id.",
        2: "ELIMINATE: clear one or two sound statements by id and say why they pass the criterion, leaving the final two.",
        3: "WALKTHROUGH: name the statement that fails and explain in plain words exactly why it fails the criterion.",
    },
}

_MODULE_ROLE = {
    'logic_thread': 'ordering shuffled exhibit cards into one logical sequence',
    'snap_gap': 'choosing the transition tile that bridges Exhibit A and Exhibit B',
    'tap_clues': 'tapping the context-clue words that unlock a vocabulary word',
    'fact_scanner': 'quarantining the witness statement that fails the active CRAAP criterion',
}


def _case_context(module: str, exercise: Dict[str, Any]) -> str:
    """The active case as Gemini needs it, answer key included for reasoning only."""
    title = exercise.get('topic_title', 'Exercise')
    lines = [f"[CASE: {title}]"]
    if module == 'logic_thread':
        blocks = exercise.get('paragraph_blocks', []) or []
        text_of = {b.get('block_id'): b.get('text', '') for b in blocks}
        lines.append("[CARDS ON THE BOARD (shuffled)]:")
        lines += [f'- "{b.get("text", "")}"' for b in blocks]
        answer = " -> ".join(f'"{text_of.get(bid, "")[:60]}"' for bid in exercise.get('correct_sequence', []))
        lines.append(f"[ANSWER KEY - reasoning only, never recite]: {answer}")
    elif module == 'snap_gap':
        tile_map = exercise.get('correct_tile_map', {}) or {}
        lines.append("[EXHIBIT PAIRS]:")
        for p in exercise.get('sentence_pairs', []) or []:
            lines.append(f'- Exhibit A: "{p.get("sentence_a", "")}" | Exhibit B: "{p.get("sentence_b", "")}" '
                         f'| correct tile (reasoning only): {tile_map.get(p.get("pair_id"), "")}')
        lines.append(f"[TILE DOCK]: {', '.join(exercise.get('transition_tile_dock', []) or [])}")
    elif module == 'tap_clues':
        words = exercise.get('locked_words', []) or []
        w = words[0] if words else {}
        clues = ", ".join(w.get('correct_clue_ids') or w.get('context_clues') or [])
        lines.append(f'[PASSAGE]: "{exercise.get("reading_passage", "")}"')
        lines.append(f'[LOCKED WORD]: "{w.get("word", "")}" (meaning, reasoning only: {w.get("definition", "")})')
        lines.append(f"[CLUE WORDS - reasoning only]: {clues}")
    elif module == 'fact_scanner':
        lines.append(f"[ACTIVE CRAAP CRITERION]: {exercise.get('craap_criterion', '')}")
        lines.append("[WITNESS STATEMENTS]:")
        for s in exercise.get('article_sentences', []) or []:
            flaw = f' [FLAWED - reasoning only: {s.get("flaw_reason", "")}]' if s.get('is_flawed') else ''
            lines.append(f'- {s.get("sentence_id")}: "{s.get("text", "")}"{flaw}')
    else:
        lines.append(f'[PASSAGE]: "{exercise.get("reading_passage", "")}"')
    return "\n".join(lines)


def build_socratic_hint_prompt(
    module: str,
    exercise: Dict[str, Any],
    submission_state: Dict[str, Any],
    error_count: int = 1,
    level: int = 1,
    baseline: str = '',
) -> str:
    """
    Prompt for a "Dig deeper" hint at `level` (1-3), grounded in the active case. `baseline` is the offline hint for
    the same level, given as a reference for how specific this level may be.
    """
    level = max(1, min(3, int(level or 1)))
    rule = _DIG_LEVELS.get(module, {}).get(level, 'Give one concise Socratic clue grounded in the case.')
    previous = f'hint {level - 1}' if level > 1 else "Crit's opening guidance"
    reference = (f'[REFERENCE HINT FOR THIS LEVEL - match its content and specificity; you may rephrase it more naturally]: "{baseline}"\n'
                 if baseline else '')
    return f"""You are Inspector Crit, the Socratic reading detective in CRITICA.
A cadet is {_MODULE_ROLE.get(module, 'working on a reading exercise')} and pressed "Dig deeper" (hint {level} of 3 on this case; {max(0, error_count - 1)} wrong attempt(s) so far).

{_case_context(module, exercise)}

[THE CADET'S CURRENT STATE]: {submission_state}
{reference}[THIS LEVEL]: {rule}
Hint {level} must be clearer and easier to act on than {previous}. {'End with a question that sends the cadet back to the evidence.' if level < 3 else 'This is the last hint: explain plainly so the cadet can choose with confidence and learn why.'}

{SOCRATIC_OUTPUT_RULES}
"""
