# backend/api/seed/seed_nodes.py
import os, sys, django

sys.path.insert(0, os.path.join(
    os.path.dirname(__file__), '..', '..'))
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.modules.logic_thread.mongo_models import (
    LogicThreadNodeDocument,
    ParagraphBlock,
    ScaffoldHint as LTHint,
)
from api.modules.snap_gap.mongo_models import (
    CoherenceNodeDocument)
from api.modules.tap_clues.mongo_models import (
    VocabularyNodeDocument)
from api.modules.fact_scanner.mongo_models import (
    ArticleDocument)


# ══════════════════════════════════════════════
# MODULE 1 — LOGIC THREAD (12 nodes)
# ══════════════════════════════════════════════

LOGIC_THREAD_NODES = [

    # ── NARRATION ─────────────────────────────

    {
        'node_id': 'log_node_01',
        'track':   'analysis',
        'title':   'Narration — Basics',
        'focus':   'Identify simple time-order '
                   'signal words',
        'micro_lesson_text': (
            'Narration tells a story in the order '
            'events happened. Look for two key time '
            'signals: "then" shows the next event, '
            'and "finally" shows the last event. '
            'The first block introduces the person '
            'and situation. Connect blocks using '
            'these signal words as your guide.'
        ),
        'reading_passage': (
            'Carlos decided to learn how to cook. '
            'Then he watched tutorial videos every '
            'evening for a week to practice. '
            'Finally, he made his first complete '
            'meal for his entire family, who were '
            'very proud of his hard work.'
        ),
        'word_count': 42,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Carlos decided to learn '
                        'how to cook.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Then he watched tutorial '
                        'videos every evening for '
                        'a week to practice.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'Finally, he made his '
                        'first complete meal for '
                        'his entire family, who '
                        'were very proud of him.',
                'order': 3,
            },
        ],
        'correct_sequence': ['b1', 'b2', 'b3'],
        'structural_explanations': {
            'b1__b2': (
                '"Then" is a direct sequence '
                'signal — the decision to learn '
                'must come before practicing.'),
            'b2__b3': (
                '"Finally" marks the last event '
                'after the practice period.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Look for "then" and "finally". '
                    '"Then" means next, "finally" '
                    'means last.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'The block with no signal word '
                    'is first. "Then" is second. '
                    '"Finally" is always last.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Carlos decides → '
                    '"Then" he practices → '
                    '"Finally" he cooks.'),
            },
        ],
    },

    {
        'node_id': 'log_node_02',
        'track':   'analysis',
        'title':   'Narration — Intermediate',
        'focus':   'Sequence events using multiple '
                   'time markers',
        'micro_lesson_text': (
            'Longer narrations use more time '
            'signals: "first" opens the sequence, '
            '"then" advances the story, '
            '"after" links connected events, '
            '"eventually" signals the final outcome '
            'after effort has passed. '
            'Each signal word builds a timeline '
            'from start to finish.'
        ),
        'reading_passage': (
            'Mia struggled with her Science project '
            'for days. First, she gathered books '
            'and articles from the library and '
            'organized her notes into an outline. '
            'Then she wrote the report section by '
            'section, revising it carefully each '
            'time. After submitting her work online, '
            'she waited anxiously for feedback. '
            'Eventually, her hard work paid off '
            'when she received the highest grade '
            'in the class.'
        ),
        'word_count': 84,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Mia struggled with her '
                        'Science project for days.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'First, she gathered books '
                        'and articles from the '
                        'library and organized her '
                        'notes into an outline.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'Then she wrote the report '
                        'section by section, '
                        'revising it carefully '
                        'each time.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'Eventually, her hard work '
                        'paid off when she received '
                        'the highest grade in class.',
                'order': 4,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4'],
        'structural_explanations': {
            'b1__b2': (
                'Introduction establishes the '
                'problem. "First" starts '
                'the actions taken to solve it.'),
            'b2__b3': (
                '"Then" advances the timeline. '
                'Gathering materials must happen '
                'before writing the report.'),
            'b3__b4': (
                '"Eventually" signals the final '
                'outcome after sustained effort.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Find the problem block first. '
                    'Then look for "first", "then", '
                    '"eventually" in order.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"First" starts the work. '
                    '"Then" continues it. '
                    '"Eventually" ends the story.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Mia struggles → '
                    '"First" she gathers → '
                    '"Then" she writes → '
                    '"Eventually" she succeeds.'),
            },
        ],
    },

    {
        'node_id': 'log_node_03',
        'track':   'analysis',
        'title':   'Narration — Advanced',
        'focus':   'Map complex chronological '
                   'narrative development',
        'micro_lesson_text': (
            'Advanced narration uses subtle signals. '
            'Beyond "first" and "finally": '
            '"during" signals an ongoing period, '
            '"after that" provides explicit '
            'sequencing, "by the time" signals '
            'a milestone. Some blocks have no '
            'signal word — rely on logical '
            'time order and contextual reference.'
        ),
        'reading_passage': (
            'Maria had always wanted to become a '
            'doctor, but the road to her dream was '
            'long and difficult. First, she worked '
            'two jobs throughout high school to '
            'save money for college. Then, after '
            'graduating as valedictorian, she '
            'earned a full scholarship to the state '
            'university. During her pre-medical '
            'years, she volunteered at the community '
            'clinic every weekend to gain experience. '
            'After that, she passed the medical '
            'entrance examinations on her first '
            'attempt. Finally, she returned to her '
            'hometown and opened a free clinic.'
        ),
        'word_count': 115,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Maria had always wanted '
                        'to become a doctor, but '
                        'the road to her dream was '
                        'long and difficult.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'First, she worked two '
                        'jobs throughout high '
                        'school to save money '
                        'for college.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'Then, after graduating '
                        'as valedictorian, she '
                        'earned a full scholarship '
                        'to the state university.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'During her pre-medical '
                        'years, she volunteered '
                        'at the community clinic '
                        'every weekend to gain '
                        'experience.',
                'order': 4,
            },
            {
                'block_id': 'b5',
                'text': 'After that, she passed '
                        'the medical entrance '
                        'examinations on her '
                        'first attempt.',
                'order': 5,
            },
            {
                'block_id': 'b6',
                'text': 'Finally, she returned '
                        'to her hometown and '
                        'opened a free clinic.',
                'order': 6,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
        'structural_explanations': {
            'b1__b2': (
                '"First" opens chronological '
                'sequence after introduction.'),
            'b2__b3': (
                '"Then" connects high school to '
                'university — natural progression.'),
            'b3__b4': (
                '"During her pre-medical years" '
                'anchors b4 to university period.'),
            'b4__b5': (
                '"After that" places b5 explicitly '
                'after the volunteering phase.'),
            'b5__b6': (
                '"Finally" closes the '
                'entire narrative.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Find all signals: "first", '
                    '"then", "during", '
                    '"after that", "finally".'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Introduction has no signal. '
                    '"First" starts the sequence. '
                    '"During" signals an '
                    'ongoing period.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Introduction → '
                    '"First" → "Then" → '
                    '"During" → "After that" → '
                    '"Finally".'),
            },
        ],
    },

    # ── DEFINITION ────────────────────────────

    {
        'node_id': 'log_node_04',
        'track':   'analysis',
        'title':   'Definition — Basics',
        'focus':   'Identify a simple three-part '
                   'definition pattern',
        'micro_lesson_text': (
            'A definition pattern has three parts: '
            'introduce the concept, explain what it '
            'means, then give an example. '
            '"For example" introduces the example. '
            'The concept always comes first. '
            'The example always comes last.'
        ),
        'reading_passage': (
            'A journal is a personal record where '
            'people write their thoughts, feelings, '
            'and daily events. It helps people '
            'reflect on their experiences and '
            'track personal growth over time. '
            'For example, students keep journals '
            'to record their learning, while adults '
            'use them to process their emotions.'
        ),
        'word_count': 55,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'A journal is a personal '
                        'record where people write '
                        'their thoughts, feelings, '
                        'and daily events.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'It helps people reflect '
                        'on their experiences and '
                        'track personal growth '
                        'over time.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'For example, students '
                        'keep journals to record '
                        'their learning, while '
                        'adults use them to process '
                        'their emotions.',
                'order': 3,
            },
        ],
        'correct_sequence': ['b1', 'b2', 'b3'],
        'structural_explanations': {
            'b1__b2': (
                'b1 says what a journal is. '
                'b2 explains what it does — '
                'purpose always follows definition.'),
            'b2__b3': (
                '"For example" introduces concrete '
                'examples. Examples always '
                'come last.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Find "a journal is" (definition) '
                    'and "for example" (examples). '
                    'Examples come last.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Block 1 defines journal. '
                    'Block 2 explains purpose. '
                    'Block 3 starts "for example".'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: "A journal is..." → '
                    '"It helps..." → '
                    '"For example..."'),
            },
        ],
    },

    {
        'node_id': 'log_node_05',
        'track':   'analysis',
        'title':   'Definition — Intermediate',
        'focus':   'Map a multi-part definition '
                   'with characteristics',
        'micro_lesson_text': (
            'Longer definition patterns add a '
            'characteristics step. Look for: '
            '"refers to" (definition), '
            '"is characterized by" (lists traits), '
            '"in other words" (restates simply), '
            '"such as" (introduces examples). '
            'Each step deepens your understanding '
            'of the concept.'
        ),
        'reading_passage': (
            'Academic integrity refers to the '
            'commitment to honest and ethical '
            'behavior in all academic work. '
            'A student with academic integrity '
            'is characterized by honesty in exams, '
            'originality in written work, and '
            'proper citation of all sources. '
            'In other words, it means doing your '
            'own work and giving credit where it '
            'is due. Violations of academic '
            'integrity, such as plagiarism and '
            'cheating, carry serious consequences.'
        ),
        'word_count': 86,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Academic integrity refers '
                        'to the commitment to honest '
                        'and ethical behavior in '
                        'all academic work.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'A student with academic '
                        'integrity is characterized '
                        'by honesty in exams, '
                        'originality in written '
                        'work, and proper citation '
                        'of all sources.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'In other words, it means '
                        'doing your own work and '
                        'giving credit where '
                        'it is due.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'Violations of academic '
                        'integrity, such as '
                        'plagiarism and cheating, '
                        'carry serious consequences.',
                'order': 4,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4'],
        'structural_explanations': {
            'b1__b2': (
                '"Refers to" is the formal '
                'definition. "Is characterized by" '
                'lists traits.'),
            'b2__b3': (
                '"In other words" simplifies the '
                'characteristics from b2.'),
            'b3__b4': (
                '"Such as" introduces examples — '
                'always near the end.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Find "refers to" (definition), '
                    '"characterized by" (traits), '
                    '"such as" (examples).'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Refers to" is first. '
                    '"Characterized by" is second. '
                    '"Such as" is near the end.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: "refers to" → '
                    '"characterized by" → '
                    '"in other words" → '
                    '"such as".'),
            },
        ],
    },

    {
        'node_id': 'log_node_06',
        'track':   'analysis',
        'title':   'Definition — Advanced',
        'focus':   'Map a full academic definition '
                   'with examples and conclusion',
        'micro_lesson_text': (
            'Academic definitions follow six steps: '
            '(1) introduce the concept, '
            '(2) formal definition, '
            '(3) characteristics, '
            '(4) restatement, '
            '(5) real-world examples, '
            '(6) conclusion with "ultimately". '
            'Every part builds on the previous. '
            'No step can be skipped or reordered.'
        ),
        'reading_passage': (
            'Media literacy is one of the most '
            'essential skills for students in the '
            'digital age. It is defined as the '
            'ability to access, analyze, evaluate, '
            'and create media in various forms. '
            'A media-literate person is '
            'characterized by the capacity to '
            'identify bias, distinguish fact from '
            'opinion, and recognize persuasive '
            'techniques. In other words, media '
            'literacy means thinking critically '
            'about every piece of content you '
            'consume. Several real-world contexts '
            'demand this skill, such as evaluating '
            'news during elections and assessing '
            'health information on social media. '
            'Ultimately, media literacy empowers '
            'citizens to participate responsibly '
            'in democratic society.'
        ),
        'word_count': 122,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Media literacy is one of '
                        'the most essential skills '
                        'for students in the '
                        'digital age.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'It is defined as the '
                        'ability to access, analyze, '
                        'evaluate, and create media '
                        'in various forms.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'A media-literate person '
                        'is characterized by the '
                        'capacity to identify bias '
                        'and recognize persuasive '
                        'techniques.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'In other words, media '
                        'literacy means thinking '
                        'critically about every '
                        'piece of content '
                        'you consume.',
                'order': 4,
            },
            {
                'block_id': 'b5',
                'text': 'Several real-world '
                        'contexts demand this '
                        'skill, such as evaluating '
                        'news during elections and '
                        'assessing health '
                        'information on '
                        'social media.',
                'order': 5,
            },
            {
                'block_id': 'b6',
                'text': 'Ultimately, media literacy '
                        'empowers citizens to '
                        'participate responsibly '
                        'in democratic society.',
                'order': 6,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
        'structural_explanations': {
            'b1__b2': (
                '"Defined as" in b2 is the formal '
                'definition — always follows the '
                'introduction.'),
            'b2__b3': (
                '"Characterized by" expands the '
                'definition with traits.'),
            'b3__b4': (
                '"In other words" restates traits '
                'in simpler language.'),
            'b4__b5': (
                '"Such as" introduces examples '
                'after the restatement.'),
            'b5__b6': (
                '"Ultimately" closes with '
                'the significance.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Six steps: introduce → define '
                    '→ characterize → restate → '
                    'exemplify → conclude.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Find "defined as" (b2), '
                    '"such as" (b5), '
                    '"ultimately" (b6).'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Introduction → '
                    '"defined as" → '
                    '"characterized by" → '
                    '"in other words" → '
                    '"such as" → "ultimately".'),
            },
        ],
    },

    # ── COMPARISON & CONTRAST ─────────────────

    {
        'node_id': 'log_node_07',
        'track':   'analysis',
        'title':   'Comparison & Contrast — Basics',
        'focus':   'Identify simple similarity '
                   'and difference signals',
        'micro_lesson_text': (
            'Comparison shows what two things share. '
            'Signal word: "both". '
            'Contrast shows how they differ. '
            'Signal word: "however". '
            'Pattern: introduce both subjects '
            'together → describe one → use '
            '"however" to show the difference.'
        ),
        'reading_passage': (
            'Cats and dogs are both popular '
            'household pets that give companionship '
            'to their owners. Cats are independent '
            'and require little attention, spending '
            'most of their time alone. Dogs, '
            'however, are social animals that need '
            'daily exercise, training, and constant '
            'interaction with people.'
        ),
        'word_count': 52,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Cats and dogs are both '
                        'popular household pets '
                        'that give companionship '
                        'to their owners.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Cats are independent and '
                        'require little attention, '
                        'spending most of their '
                        'time alone.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'Dogs, however, are social '
                        'animals that need daily '
                        'exercise, training, and '
                        'constant interaction '
                        'with people.',
                'order': 3,
            },
        ],
        'correct_sequence': ['b1', 'b2', 'b3'],
        'structural_explanations': {
            'b1__b2': (
                '"Both" introduces both subjects. '
                'b2 describes the first '
                'subject specifically.'),
            'b2__b3': (
                '"However" signals the contrast — '
                'dogs are opposite to the cats '
                'description.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    '"Both" introduces both subjects. '
                    '"However" shows the difference.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Both cats and dogs" comes '
                    'first. Cats are described. '
                    '"However, dogs" comes last.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: "both" (intro) → '
                    'Cats described → '
                    '"However" dogs described.'),
            },
        ],
    },

    {
        'node_id': 'log_node_08',
        'track':   'analysis',
        'title':   'Comparison & Contrast — '
                   'Intermediate',
        'focus':   'Map a four-part compare '
                   'and contrast structure',
        'micro_lesson_text': (
            'Longer comparison-contrast texts '
            'alternate between similarities and '
            'differences. Pattern: introduce both '
            '→ describe Subject A → "in contrast" '
            'for Subject B → "while" or "whereas" '
            'for a final parallel distinction. '
            'Watch for signals shifting '
            'between two sides.'
        ),
        'reading_passage': (
            'Reading books and watching films '
            'both tell stories and help audiences '
            'understand different life perspectives. '
            'Reading requires active mental '
            'engagement — readers must imagine '
            'characters and events from words alone. '
            'In contrast, films provide visual and '
            'audio stimulation, making stories '
            'easier to follow with less imagination. '
            'While films reach wider audiences more '
            'quickly, books develop vocabulary, '
            'concentration, and deeper '
            'critical thinking.'
        ),
        'word_count': 88,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Reading books and watching '
                        'films both tell stories '
                        'and help audiences '
                        'understand different '
                        'life perspectives.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Reading requires active '
                        'mental engagement — '
                        'readers must imagine '
                        'characters and events '
                        'from words alone.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'In contrast, films '
                        'provide visual and audio '
                        'stimulation, making '
                        'stories easier to follow '
                        'with less imagination.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'While films reach wider '
                        'audiences more quickly, '
                        'books develop vocabulary, '
                        'concentration, and deeper '
                        'critical thinking.',
                'order': 4,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4'],
        'structural_explanations': {
            'b1__b2': (
                '"Both" introduces both subjects. '
                'b2 focuses on reading (A).'),
            'b2__b3': (
                '"In contrast" shifts to films (B).'),
            'b3__b4': (
                '"While" creates a final parallel '
                'contrast between both subjects.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Find "both" (intro), '
                    '"in contrast" (shift to B), '
                    '"while" (final comparison).'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Both" first. Reading second. '
                    '"In contrast" shifts to films. '
                    '"While" gives final contrast.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: "both" → reading → '
                    '"in contrast" (films) → '
                    '"while" (final).'),
            },
        ],
    },

    {
        'node_id': 'log_node_09',
        'track':   'analysis',
        'title':   'Comparison & Contrast — '
                   'Advanced',
        'focus':   'Map a complex multi-criteria '
                   'comparison text',
        'micro_lesson_text': (
            'Advanced compare-contrast texts '
            'oscillate between signals repeatedly: '
            '"both" (similarity), "in contrast" '
            '(major difference), "both" again '
            '(returning to shared traits), "however" '
            '(back to difference), closing with '
            '"ultimately, both" (shared value). '
            'This oscillating structure is the '
            'hallmark of academic writing.'
        ),
        'reading_passage': (
            'Traditional libraries and digital '
            'libraries both serve the fundamental '
            'purpose of providing access to '
            'information and supporting learning. '
            'Traditional libraries offer physical '
            'books, quiet study spaces, and trained '
            'librarians for personalized assistance. '
            'In contrast, digital libraries provide '
            'unlimited access to millions of '
            'documents from any device at any time. '
            'Both formats organize materials using '
            'classification systems and employ '
            'specialists to curate their collections. '
            'However, traditional libraries foster '
            'deeper community connections and a '
            'distraction-free environment. '
            'Ultimately, both types of library serve '
            'essential roles in an informed society.'
        ),
        'word_count': 118,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Traditional libraries and '
                        'digital libraries both '
                        'serve the fundamental '
                        'purpose of providing '
                        'access to information.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Traditional libraries '
                        'offer physical books, '
                        'quiet study spaces, and '
                        'trained librarians for '
                        'personalized assistance.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'In contrast, digital '
                        'libraries provide '
                        'unlimited access to '
                        'millions of documents '
                        'from any device '
                        'at any time.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'Both formats organize '
                        'materials using '
                        'classification systems '
                        'and employ specialists '
                        'to curate their '
                        'collections.',
                'order': 4,
            },
            {
                'block_id': 'b5',
                'text': 'However, traditional '
                        'libraries foster deeper '
                        'community connections '
                        'and a distraction-free '
                        'environment.',
                'order': 5,
            },
            {
                'block_id': 'b6',
                'text': 'Ultimately, both types '
                        'of library serve essential '
                        'roles in an '
                        'informed society.',
                'order': 6,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
        'structural_explanations': {
            'b1__b2': (
                '"Both" opens with shared purpose. '
                'b2 describes traditional (A).'),
            'b2__b3': (
                '"In contrast" shifts to digital.'),
            'b3__b4': (
                '"Both formats" returns to '
                'comparison — the oscillation.'),
            'b4__b5': (
                '"However" shifts back to contrast.'),
            'b5__b6': (
                '"Ultimately, both" closes with '
                'shared value.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pattern oscillates: "both" → '
                    'contrast → "both" again → '
                    '"however" → '
                    '"ultimately both".'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Both serve" is first. '
                    '"In contrast" is third. '
                    '"Both formats" is fourth. '
                    '"Ultimately" is last.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: "both serve" → '
                    'traditional → "in contrast" '
                    '→ "both formats" → '
                    '"however" → '
                    '"ultimately both".'),
            },
        ],
    },

    # ── CAUSE & EFFECT ────────────────────────

    {
        'node_id': 'log_node_10',
        'track':   'analysis',
        'title':   'Cause & Effect — Basics',
        'focus':   'Identify a simple cause '
                   'and its direct effect',
        'micro_lesson_text': (
            'A cause is why something happened. '
            'An effect is what happened because '
            'of it. Two signals: "because" '
            'introduces a cause, "as a result" '
            'introduces an effect. '
            'The cause always comes before '
            'its effect.'
        ),
        'reading_passage': (
            'Rina forgot to set her alarm the '
            'night before her final exam. '
            'Because her phone was off, she did '
            'not hear any notifications. '
            'As a result, she arrived at the '
            'testing center thirty minutes late '
            'and missed the first section.'
        ),
        'word_count': 47,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Rina forgot to set her '
                        'alarm the night before '
                        'her final exam.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Because her phone was '
                        'off, she did not hear '
                        'any notifications.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'As a result, she arrived '
                        'at the testing center '
                        'thirty minutes late and '
                        'missed the first section.',
                'order': 3,
            },
        ],
        'correct_sequence': ['b1', 'b2', 'b3'],
        'structural_explanations': {
            'b1__b2': (
                'b1 is the original cause. '
                '"Because" in b2 introduces '
                'the triggering event.'),
            'b2__b3': (
                '"As a result" in b3 is the '
                'direct effect of b2.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    '"Because" introduces the '
                    'reason. "As a result" '
                    'introduces what happened.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Rina forgetting is the setup. '
                    '"Because" is the cause. '
                    '"As a result" is the effect.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Setup (forgot) → '
                    '"Because" (cause) → '
                    '"As a result" (effect).'),
            },
        ],
    },

    {
        'node_id': 'log_node_11',
        'track':   'analysis',
        'title':   'Cause & Effect — Intermediate',
        'focus':   'Map a chained cause-effect '
                   'academic argument',
        'micro_lesson_text': (
            'In academic texts, effects become '
            'new causes — creating a chain. '
            '"Since" and "because" introduce '
            'causes. "Consequently" and '
            '"therefore" introduce effects. '
            'Watch for chains where one block\'s '
            'effect is the next block\'s cause.'
        ),
        'reading_passage': (
            'Many students skip breakfast because '
            'they wake up too late. Since the '
            'brain needs glucose to function, '
            'students who skip breakfast experience '
            'difficulty concentrating in class. '
            'Consequently, their quiz scores in '
            'the first period are significantly '
            'lower. Therefore, nutrition experts '
            'recommend that schools implement a '
            'short breakfast break before '
            'first period.'
        ),
        'word_count': 72,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'Many students skip '
                        'breakfast because they '
                        'wake up too late.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Since the brain needs '
                        'glucose to function, '
                        'students who skip '
                        'breakfast experience '
                        'difficulty concentrating '
                        'in class.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'Consequently, their quiz '
                        'scores in the first period '
                        'are significantly lower.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'Therefore, nutrition '
                        'experts recommend that '
                        'schools implement a short '
                        'breakfast break before '
                        'first period.',
                'order': 4,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4'],
        'structural_explanations': {
            'b1__b2': (
                '"Because" in b1 states the '
                'initial cause. "Since" in b2 '
                'uses the effect as a new cause.'),
            'b2__b3': (
                '"Consequently" shows the '
                'measurable academic effect.'),
            'b3__b4': (
                '"Therefore" introduces the '
                'recommended response.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Trace the chain: each '
                    'effect becomes the next '
                    'cause. "Since", '
                    '"consequently", "therefore".'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Because" (skipping) → '
                    '"since" (brain) → '
                    '"consequently" (scores) → '
                    '"therefore" (solution).'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: skipping → '
                    '"since" brain → '
                    '"consequently" lower scores '
                    '→ "therefore" recommendation.'),
            },
        ],
    },

    {
        'node_id': 'log_node_12',
        'track':   'analysis',
        'title':   'Cause & Effect — Advanced',
        'focus':   'Map complex cascading '
                   'cause-effect relationships',
        'micro_lesson_text': (
            'Advanced texts feature cascading chains '
            'where one cause produces multiple '
            'effects, and effects trigger further '
            'consequences. Mixed signals appear: '
            '"because"/"since" (causes), '
            '"as a result of" (chained effect), '
            '"consequently" (systemic response), '
            '"therefore" (final effect). '
            'The challenge is knowing whether '
            'a block is a cause, effect, or both.'
        ),
        'reading_passage': (
            'The widespread adoption of smartphones '
            'among teenagers has significantly '
            'changed how young people communicate '
            'and learn. Because smartphones provide '
            'constant access to social media, many '
            'teenagers spend an average of seven '
            'hours per day on their devices. As a '
            'result of this excessive screen time, '
            'researchers have documented increases '
            'in anxiety and sleep disorders. Since '
            'teenagers stay awake later due to '
            'device use, their academic performance '
            'has declined. Consequently, schools '
            'have begun implementing phone-free '
            'policies. This intervention, therefore, '
            'has led to measurable improvements '
            'in student focus.'
        ),
        'word_count': 116,
        'paragraph_blocks': [
            {
                'block_id': 'b1',
                'text': 'The widespread adoption '
                        'of smartphones among '
                        'teenagers has significantly '
                        'changed how young people '
                        'communicate and learn.',
                'order': 1,
            },
            {
                'block_id': 'b2',
                'text': 'Because smartphones '
                        'provide constant access '
                        'to social media, many '
                        'teenagers spend an average '
                        'of seven hours per day '
                        'on their devices.',
                'order': 2,
            },
            {
                'block_id': 'b3',
                'text': 'As a result of this '
                        'excessive screen time, '
                        'researchers have documented '
                        'increases in anxiety '
                        'and sleep disorders.',
                'order': 3,
            },
            {
                'block_id': 'b4',
                'text': 'Since teenagers stay '
                        'awake later due to device '
                        'use, their academic '
                        'performance has declined.',
                'order': 4,
            },
            {
                'block_id': 'b5',
                'text': 'Consequently, schools '
                        'have begun implementing '
                        'phone-free policies.',
                'order': 5,
            },
            {
                'block_id': 'b6',
                'text': 'This intervention, '
                        'therefore, has led to '
                        'measurable improvements '
                        'in student focus.',
                'order': 6,
            },
        ],
        'correct_sequence': [
            'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
        'structural_explanations': {
            'b1__b2': (
                'b1 is the root cause. '
                '"Because" in b2 explains '
                'the mechanism.'),
            'b2__b3': (
                '"As a result of this" references '
                'screen time from b2.'),
            'b3__b4': (
                '"Since... due to device use" '
                'uses b3\'s effects as new cause.'),
            'b4__b5': (
                '"Consequently" is the systemic '
                'response to academic decline.'),
            'b5__b6': (
                '"Therefore" is the final outcome '
                'of the intervention.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One block is the root cause. '
                    'Each block after is either '
                    'an effect or response.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Because" starts the '
                    'mechanism. "As a result" '
                    'shows health effects. '
                    '"Consequently" shows '
                    'policy response.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Order: Root cause → '
                    '"Because" → "As a result" '
                    '→ "Since" → "Consequently" '
                    '→ "Therefore".'),
            },
        ],
    },
]


def seed_logic_thread():
    print('\n── Seeding Module 1: Logic Thread ──')
    for nd in LOGIC_THREAD_NODES:
        existing = LogicThreadNodeDocument.objects(
            node_id=nd['node_id']).first()
        if existing:
            existing.delete()
            print(f'  Updated: {nd["node_id"]}'
                  f' — {nd["title"]}')
        else:
            print(f'  Seeded:  {nd["node_id"]}'
                  f' — {nd["title"]}')

        doc = LogicThreadNodeDocument()
        doc.node_id      = nd['node_id']
        doc.track        = nd['track']
        doc.title        = nd['title']
        doc.focus        = nd['focus']
        doc.micro_lesson_text    = nd['micro_lesson_text']
        doc.reading_passage      = nd['reading_passage']
        doc.word_count           = nd['word_count']
        doc.correct_sequence     = nd['correct_sequence']
        doc.structural_explanations = nd['structural_explanations']
        doc.scaffold_hints = [
            LTHint(tier=h['tier'],
                   hint_text=h['hint_text'])
            for h in nd['scaffold_hints']
        ]
        doc.paragraph_blocks = [
            ParagraphBlock(
                block_id=b['block_id'],
                text=b['text'],
                order=b['order'],
            )
            for b in nd['paragraph_blocks']
        ]
        doc.save()


# ══════════════════════════════════════════════
# MODULE 2 — SNAP-IN GAP (12 nodes)
# ══════════════════════════════════════════════

SNAP_GAP_NODES = [

    # ── ADDITION & SEQUENCE ───────────────────

    {
        'node_id': 'snp_node_01',
        'title':   'Addition & Sequence — Basics',
        'focus':   'Identify the simplest '
                   'addition transition',
        'micro_lesson_text': (
            'Addition transitions connect two '
            'ideas by adding more information. '
            '"Furthermore" means "and also" — '
            'the second sentence adds to the '
            'first. When both sentences describe '
            'the same kind of thing, use '
            '"furthermore".'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Ana enjoys reading '
                              'novels in her '
                              'free time.',
                'sentence_b': 'she watches '
                              'documentary films '
                              'on weekends.',
            },
        ],
        'transition_tile_dock': [
            'Furthermore', 'However',
            'Therefore', 'Also',
            'Nevertheless', 'As a result',
        ],
        'correct_tile_map': {
            'pair_01': 'Furthermore',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'Both are things Ana enjoys — '
                'not opposing ideas.'),
            'pair_01__Therefore': (
                '"Therefore" signals a result. '
                'Watching films is not a '
                'consequence of reading — '
                'it is another activity.'),
            'pair_01__As a result': (
                '"As a result" implies films '
                'happened because of reading. '
                'They are independent hobbies.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Both sentences describe '
                    'things Ana likes. Look for '
                    'a word that means "and also".'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Addition words: furthermore, '
                    'also, additionally, '
                    'in addition.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"Furthermore" fits: Ana enjoys '
                    'reading; furthermore, she '
                    'also enjoys films.'),
            },
        ],
    },

    {
        'node_id': 'snp_node_02',
        'title':   'Addition & Sequence — '
                   'Intermediate',
        'focus':   'Use addition and sequence '
                   'in a two-pair context',
        'micro_lesson_text': (
            'Addition words (additionally, '
            'furthermore) add equal information. '
            'Sequence words (next, then, first) '
            'show ordered steps. '
            'The key difference: addition adds '
            'information of equal importance, '
            'while sequence shows one step '
            'must come before another.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'The student council '
                              'organized a coastal '
                              'cleanup last Saturday.',
                'sentence_b': 'they plan to hold a '
                              'tree-planting activity '
                              'next month.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'To write a strong '
                              'argumentative essay, '
                              'begin with a clear '
                              'thesis statement.',
                'sentence_b': 'develop each '
                              'paragraph with '
                              'specific evidence '
                              'and analysis.',
            },
        ],
        'transition_tile_dock': [
            'Additionally', 'However',
            'Therefore', 'Next',
            'Nevertheless', 'As a result',
        ],
        'correct_tile_map': {
            'pair_01': 'Additionally',
            'pair_02': 'Next',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'Both activities are programs '
                'by the council — not opposing.'),
            'pair_01__Therefore': (
                '"Therefore" implies the second '
                'event is a result of the first. '
                'They are separate events.'),
            'pair_02__However': (
                '"However" signals contrast. '
                'Both sentences describe writing '
                'steps — not opposing ideas.'),
            'pair_02__Therefore': (
                '"Therefore" suggests a consequence. '
                'Developing paragraphs is the '
                'next step, not a result.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01 adds another event. '
                    'Pair 02 shows the next step '
                    'in a writing process.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Pair 01: use an addition word. '
                    'Pair 02: use a sequence word '
                    'since it is a process step.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "Additionally". '
                    'Pair 02: "Next".'),
            },
        ],
    },

    {
        'node_id': 'snp_node_03',
        'title':   'Addition & Sequence — Advanced',
        'focus':   'Apply complex addition '
                   'transitions academically',
        'micro_lesson_text': (
            '"Moreover" and "furthermore" add '
            'supporting evidence of increasing '
            'importance in academic writing. '
            '"Subsequently" means "after that" '
            'in a formal sequence. '
            '"In addition" formally adds a '
            'parallel point. Choose carefully: '
            'addition words are for equal points, '
            'sequence words are for ordered steps.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Critical reading '
                              'requires students '
                              'to identify the '
                              'author\'s argument.',
                'sentence_b': 'it demands careful '
                              'evaluation of the '
                              'evidence used to '
                              'support that argument.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'To conduct credible '
                              'research, begin by '
                              'formulating a precise '
                              'research question.',
                'sentence_b': 'locate sources from '
                              'peer-reviewed journals '
                              'and academic databases.',
            },
            {
                'pair_id':    'pair_03',
                'sentence_a': 'Students must outline '
                              'their arguments '
                              'before drafting '
                              'their paper.',
                'sentence_b': 'they should revise '
                              'their work at least '
                              'twice before '
                              'submission.',
            },
        ],
        'transition_tile_dock': [
            'Furthermore', 'However',
            'Subsequently', 'In addition',
            'Nevertheless', 'Consequently',
        ],
        'correct_tile_map': {
            'pair_01': 'Furthermore',
            'pair_02': 'Subsequently',
            'pair_03': 'In addition',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. Both '
                'sentences describe what critical '
                'reading requires — not opposing.'),
            'pair_01__Consequently': (
                '"Consequently" implies an effect. '
                'Evaluating evidence is an equal '
                'additional requirement.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds equal info. '
                'Locating sources is the next '
                'ordered step, not an equal point.'),
            'pair_02__Nevertheless': (
                '"Nevertheless" signals contrast '
                'despite difficulty. No contrast '
                'here — just the next step.'),
            'pair_03__However': (
                '"However" signals opposition. '
                'Revising is an additional '
                'step, not an opposing action.'),
            'pair_03__Consequently': (
                '"Consequently" implies revision '
                'is caused by outlining. '
                'It is an independent step.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01 adds an equal '
                    'requirement. Pair 02 is '
                    'the next research step. '
                    'Pair 03 adds another step.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Furthermore" for equal '
                    'academic points. '
                    '"Subsequently" for next '
                    'step. "In addition" for '
                    'parallel step.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "Furthermore". '
                    'Pair 02: "Subsequently". '
                    'Pair 03: "In addition".'),
            },
        ],
    },

    # ── CONTRAST & OPPOSITION ─────────────────

    {
        'node_id': 'snp_node_04',
        'title':   'Contrast & Opposition — Basics',
        'focus':   'Identify the most basic '
                   'contrast transition',
        'micro_lesson_text': (
            '"However" is the most common contrast '
            'word. Use it when the second sentence '
            'is the opposite of or contradicts '
            'the first. Ask: does the second '
            'sentence agree with or disagree '
            'with the first? If disagree — '
            'use "however".'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Ben studied for '
                              'the exam every night '
                              'for a week.',
                'sentence_b': 'he failed to answer '
                              'three of the five '
                              'essay questions.',
            },
        ],
        'transition_tile_dock': [
            'However', 'Furthermore',
            'Therefore', 'Also',
            'As a result', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'However',
        },
        'tile_error_explanations': {
            'pair_01__Furthermore': (
                '"Furthermore" adds more of the '
                'same. Failing despite studying '
                'is a contrast, not an addition.'),
            'pair_01__Therefore': (
                '"Therefore" implies failing was '
                'the logical result of studying, '
                'which is wrong. This is a '
                'surprising contrast.'),
            'pair_01__As a result': (
                '"As a result" implies studying '
                'caused him to fail. The sentences '
                'show a contradiction.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Ben studied hard but failed. '
                    'The second sentence is '
                    'surprising. Look for '
                    'a contrast word.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"However" is used when the '
                    'second idea is unexpected '
                    'or opposite to the first.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"However" fits: Ben studied; '
                    'however, he still failed.'),
            },
        ],
    },

    {
        'node_id': 'snp_node_05',
        'title':   'Contrast & Opposition — '
                   'Intermediate',
        'focus':   'Use contrast transitions '
                   'in a two-pair context',
        'micro_lesson_text': (
            'Multiple contrast signals: '
            '"nevertheless" acknowledges a point '
            'but presents an opposing outcome; '
            '"on the other hand" introduces the '
            'other side of a comparison. '
            'Simple opposition → "however". '
            'Expected vs actual outcome → '
            '"nevertheless". '
            'Parallel comparison → '
            '"on the other hand".'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Online learning '
                              'offers students '
                              'flexibility in '
                              'managing their '
                              'own schedules.',
                'sentence_b': 'many students '
                              'struggle without '
                              'the structure '
                              'of a classroom.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Physical books '
                              'provide a tactile '
                              'reading experience '
                              'many readers prefer.',
                'sentence_b': 'e-books allow '
                              'readers to carry '
                              'thousands of titles '
                              'in one device.',
            },
        ],
        'transition_tile_dock': [
            'Nevertheless', 'On the other hand',
            'Therefore', 'Furthermore',
            'As a result', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'Nevertheless',
            'pair_02': 'On the other hand',
        },
        'tile_error_explanations': {
            'pair_01__Therefore': (
                '"Therefore" implies struggling '
                'is a consequence of flexibility. '
                'These ideas are in tension.'),
            'pair_01__Furthermore': (
                '"Furthermore" adds the same kind '
                'of info. The struggle is a '
                'contrast to the benefit.'),
            'pair_02__Therefore': (
                '"Therefore" implies e-books are '
                'a result of physical books. '
                'These are two options compared.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds to the same '
                'subject. These present two '
                'different subjects contrasted.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01: flexibility is a '
                    'benefit but struggling '
                    'is a drawback. '
                    'Pair 02: two formats compared.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Nevertheless": "even so, '
                    'there is also a problem." '
                    '"On the other hand": '
                    'introduces the other side.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "Nevertheless". '
                    'Pair 02: "On the other hand".'),
            },
        ],
    },

    {
        'node_id': 'snp_node_06',
        'title':   'Contrast & Opposition — '
                   'Advanced',
        'focus':   'Apply nuanced contrast '
                   'in academic arguments',
        'micro_lesson_text': (
            'Three contrast signals for '
            'academic writing: '
            '"however" (simple opposition), '
            '"whereas" (structural parallel '
            'contrast between two clauses), '
            '"nevertheless" (conceding a point '
            'before opposing it). '
            'The wrong choice changes the '
            'logic of the entire argument.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Standardized tests '
                              'offer a consistent '
                              'benchmark for '
                              'comparing student '
                              'performance.',
                'sentence_b': 'critics argue they '
                              'fail to measure '
                              'creativity, critical '
                              'thinking, and '
                              'real-world competence.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Traditional classroom '
                              'instruction allows '
                              'teachers to monitor '
                              'comprehension in '
                              'real time.',
                'sentence_b': 'self-paced digital '
                              'learning gives '
                              'students full control '
                              'over their '
                              'study pace.',
            },
            {
                'pair_id':    'pair_03',
                'sentence_a': 'Frequent formative '
                              'assessments help '
                              'teachers identify '
                              'learning gaps early.',
                'sentence_b': 'excessive testing '
                              'may reduce intrinsic '
                              'motivation and '
                              'increase academic '
                              'anxiety.',
            },
        ],
        'transition_tile_dock': [
            'However', 'Whereas',
            'Nevertheless', 'Furthermore',
            'Consequently', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'However',
            'pair_02': 'Whereas',
            'pair_03': 'Nevertheless',
        },
        'tile_error_explanations': {
            'pair_01__Furthermore': (
                '"Furthermore" adds the same '
                'kind of info. Critics opposing '
                'tests is a contrast.'),
            'pair_01__Whereas': (
                '"Whereas" is parallel contrast. '
                'Here one view then its opposition '
                '— "however" is cleaner.'),
            'pair_02__However': (
                '"However" is simple opposition. '
                'These describe two different '
                'models — "whereas" handles '
                'parallel contrast better.'),
            'pair_02__Consequently': (
                '"Consequently" implies digital '
                'is a result of classroom. '
                'They are independent models.'),
            'pair_03__Furthermore': (
                '"Furthermore" adds the same. '
                'Excessive testing reducing '
                'motivation is a contrast '
                'to the benefit.'),
            'pair_03__Whereas': (
                '"Whereas" is structural parallel. '
                'This pair concedes then opposes '
                '— "nevertheless" is better.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01: benefit then '
                    'opposing view. Pair 02: '
                    'two parallel systems. '
                    'Pair 03: benefit then risk.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"However": simple opposition. '
                    '"Whereas": parallel contrast. '
                    '"Nevertheless": concede '
                    'then oppose.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "However". '
                    'Pair 02: "Whereas". '
                    'Pair 03: "Nevertheless".'),
            },
        ],
    },

    # ── CAUSE & EFFECT ────────────────────────

    {
        'node_id': 'snp_node_07',
        'title':   'Cause & Effect — Basics',
        'focus':   'Identify the simplest '
                   'cause-effect transition',
        'micro_lesson_text': (
            '"Therefore" means "because of this, '
            'the following happened." Use it when '
            'the second sentence is a direct '
            'result of the first. '
            'Test: Can you say "because of that" '
            'instead? If yes — use "therefore".'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Rina forgot to set '
                              'her alarm the night '
                              'before her exam.',
                'sentence_b': 'she arrived at the '
                              'testing center '
                              'thirty minutes late.',
            },
        ],
        'transition_tile_dock': [
            'Therefore', 'However',
            'Furthermore', 'Also',
            'Nevertheless', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'Therefore',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'Arriving late is a direct result, '
                'not a surprising contradiction.'),
            'pair_01__Furthermore': (
                '"Furthermore" adds equal info. '
                'Arriving late is not another '
                'similar event — it is '
                'the consequence.'),
            'pair_01__Also': (
                '"Also" adds parallel info. '
                'These events are cause and '
                'effect, not a list.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Rina forgot her alarm. '
                    'Arriving late happened '
                    'because of that. Look for '
                    'a cause-effect word.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Therefore" shows the second '
                    'event is a direct result '
                    'of the first.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"Therefore" fits: Rina '
                    'forgot her alarm; therefore, '
                    'she arrived late.'),
            },
        ],
    },

    {
        'node_id': 'snp_node_08',
        'title':   'Cause & Effect — Intermediate',
        'focus':   'Distinguish between two '
                   'cause-effect signals',
        'micro_lesson_text': (
            '"As a result" emphasizes the direct '
            'observable outcome of an event. '
            '"Consequently" is more formal and '
            'used in academic or institutional '
            'contexts. Both introduce effects, '
            'but "consequently" is preferred '
            'when the consequence involves a '
            'formal response or policy.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'The power outage '
                              'lasted twelve hours '
                              'during the school\'s '
                              'final exams week.',
                'sentence_b': 'several online '
                              'examinations had to '
                              'be rescheduled to '
                              'the following week.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'The student submitted '
                              'a paper containing '
                              'substantial '
                              'plagiarized content.',
                'sentence_b': 'she received a '
                              'failing grade and '
                              'was required to '
                              'attend an academic '
                              'integrity seminar.',
            },
        ],
        'transition_tile_dock': [
            'As a result', 'Consequently',
            'However', 'Furthermore',
            'Nevertheless', 'On the other hand',
        ],
        'correct_tile_map': {
            'pair_01': 'As a result',
            'pair_02': 'Consequently',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'Rescheduling is a direct '
                'consequence, not an '
                'opposing idea.'),
            'pair_01__Furthermore': (
                '"Furthermore" adds equal info. '
                'Rescheduling is not another '
                'similar event.'),
            'pair_02__However': (
                '"However" signals contrast. '
                'Failing and attending a seminar '
                'are expected consequences '
                'of plagiarism.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds parallel info. '
                'The consequences are effects, '
                'not additions.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Both pairs show consequences. '
                    'The second sentence is what '
                    'happened because of the first.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"As a result": direct factual '
                    'outcome. "Consequently": '
                    'formal/institutional response.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "As a result" '
                    '(factual outcome). '
                    'Pair 02: "Consequently" '
                    '(formal academic consequence).'),
            },
        ],
    },

    {
        'node_id': 'snp_node_09',
        'title':   'Cause & Effect — Advanced',
        'focus':   'Apply cause-effect transitions '
                   'in complex academic arguments',
        'micro_lesson_text': (
            'Three signals to distinguish: '
            '"consequently" for systemic effects '
            'in programs or institutions; '
            '"therefore" for logical reasoned '
            'conclusions from evidence; '
            '"as a result" for directly measured '
            'empirical outcomes. '
            'The wrong choice changes the '
            'academic tone of the argument.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Mandatory reading '
                              'programs increased '
                              'student exposure '
                              'to diverse texts '
                              'across all subjects.',
                'sentence_b': 'library membership '
                              'and voluntary reading '
                              'rose by 34% within '
                              'two years.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Poorly structured '
                              'arguments undermine '
                              'an author\'s '
                              'credibility and '
                              'confuse the reader.',
                'sentence_b': 'academic readers '
                              'are less likely to '
                              'cite or engage with '
                              'poorly argued papers.',
            },
            {
                'pair_id':    'pair_03',
                'sentence_a': 'Gamified learning '
                              'tools increased '
                              'student engagement '
                              'and intrinsic '
                              'motivation.',
                'sentence_b': 'content retention '
                              'improved by 28% '
                              'compared to '
                              'traditional '
                              'instruction.',
            },
        ],
        'transition_tile_dock': [
            'Consequently', 'Therefore',
            'As a result', 'However',
            'Furthermore', 'Nevertheless',
        ],
        'correct_tile_map': {
            'pair_01': 'Consequently',
            'pair_02': 'Therefore',
            'pair_03': 'As a result',
        },
        'tile_error_explanations': {
            'pair_01__Therefore': (
                '"Therefore" is a logical '
                'conclusion. Library increases '
                'are a systemic program effect — '
                '"consequently" fits better.'),
            'pair_01__However': (
                '"However" signals contrast. '
                'A rise in reading is the '
                'expected consequence.'),
            'pair_02__Consequently': (
                '"Consequently" works but '
                '"therefore" is more precise — '
                'lower citation is a logical '
                'deduction from the premise.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds equal info. '
                'Lower citation is a '
                'logical consequence.'),
            'pair_03__Therefore': (
                '"Therefore" is logical deduction. '
                'Improved retention is a measured '
                'outcome — "as a result" fits '
                'empirical data better.'),
            'pair_03__Nevertheless': (
                '"Nevertheless" signals contrast. '
                'Improved retention is consistent '
                'with increased engagement.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'All three pairs show '
                    'cause-effect. The challenge '
                    'is choosing the right '
                    'signal for each context.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Consequently": systemic '
                    'program effects. '
                    '"Therefore": logical '
                    'conclusions. '
                    '"As a result": '
                    'measured outcomes.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "Consequently". '
                    'Pair 02: "Therefore". '
                    'Pair 03: "As a result".'),
            },
        ],
    },

    # ── CONCLUSION SIGNALS ────────────────────

    {
        'node_id': 'snp_node_10',
        'title':   'Conclusion Signals — Basics',
        'focus':   'Identify the simplest '
                   'conclusion transition',
        'micro_lesson_text': (
            '"Ultimately" signals the most '
            'important final truth. It means: '
            '"after everything said, this is '
            'what matters most." When the second '
            'sentence summarizes the most '
            'important lesson from the first, '
            'use "ultimately".'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Studying hard, '
                              'joining review '
                              'sessions, and asking '
                              'questions all '
                              'contribute to '
                              'academic success.',
                'sentence_b': 'consistent effort '
                              'and dedication are '
                              'what separate '
                              'high-achieving '
                              'students from '
                              'the rest.',
            },
        ],
        'transition_tile_dock': [
            'Ultimately', 'However',
            'Furthermore', 'Therefore',
            'Also', 'As a result',
        ],
        'correct_tile_map': {
            'pair_01': 'Ultimately',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'The second sentence reinforces '
                'the first — not an opposition.'),
            'pair_01__Furthermore': (
                '"Furthermore" adds more info. '
                'The second sentence draws '
                'the final conclusion.'),
            'pair_01__Therefore': (
                '"Therefore" implies a logical '
                'deduction. The second sentence '
                'is the overarching takeaway.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'The second sentence draws '
                    'the most important lesson. '
                    'Look for a closing word.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Ultimately" wraps up an '
                    'argument by stating the '
                    'final most important truth.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"Ultimately" fits: studying '
                    'helps; ultimately, consistent '
                    'effort is what matters.'),
            },
        ],
    },

    {
        'node_id': 'snp_node_11',
        'title':   'Conclusion Signals — '
                   'Intermediate',
        'focus':   'Apply two different '
                   'conclusion transitions',
        'micro_lesson_text': (
            'Three conclusion signals: '
            '"ultimately" states the final '
            'significance; "in summary" recaps '
            'the main points; "therefore" '
            'closes a logical argument. '
            'Ask: is the second sentence '
            'summarizing (in summary), stating '
            'final significance (ultimately), '
            'or drawing a logical conclusion '
            '(therefore)?'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Exercise improves '
                              'cardiovascular '
                              'health, reduces '
                              'stress, sharpens '
                              'focus, and '
                              'strengthens immunity.',
                'sentence_b': 'every student '
                              'benefits from '
                              'incorporating at '
                              'least 30 minutes of '
                              'physical activity '
                              'into their daily '
                              'routine.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Multiple studies '
                              'confirm that sleep '
                              'deprivation harms '
                              'memory, emotional '
                              'regulation, and '
                              'academic performance.',
                'sentence_b': 'prioritizing at '
                              'least eight hours '
                              'of sleep must be '
                              'central to any '
                              'student wellness '
                              'program.',
            },
        ],
        'transition_tile_dock': [
            'In summary', 'Therefore',
            'However', 'Furthermore',
            'Nevertheless', 'On the other hand',
        ],
        'correct_tile_map': {
            'pair_01': 'In summary',
            'pair_02': 'Therefore',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'The recommendation follows '
                'naturally from the benefits.'),
            'pair_01__Therefore': (
                '"Therefore" is a logical '
                'deduction. The second sentence '
                'summarizes a list — '
                '"in summary" fits better.'),
            'pair_02__However': (
                '"However" signals contrast. '
                'The sleep recommendation '
                'is the direct conclusion '
                'from the evidence.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds more info. '
                'The second sentence draws '
                'a conclusion, not more evidence.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01 lists benefits then '
                    'draws a general conclusion. '
                    'Pair 02 presents evidence '
                    'then a recommendation.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"In summary": wraps up a list. '
                    '"Therefore": draws a logical '
                    'conclusion from evidence.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "In summary". '
                    'Pair 02: "Therefore".'),
            },
        ],
    },

    {
        'node_id': 'snp_node_12',
        'title':   'Conclusion Signals — Advanced',
        'focus':   'Apply advanced conclusion '
                   'signals in academic arguments',
        'micro_lesson_text': (
            'Advanced conclusion signals: '
            '"in conclusion" formally closes an '
            'extended academic argument; '
            '"therefore" closes a single '
            'logical chain; "ultimately" asserts '
            'the final significance of the '
            'argument. The wrong signal makes an '
            'academic paragraph sound '
            'poorly structured.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Media literacy '
                              'equips students to '
                              'identify bias, '
                              'question sources, '
                              'and resist '
                              'manipulation.',
                'sentence_b': 'it must be treated '
                              'as a core academic '
                              'competency alongside '
                              'mathematics and '
                              'language arts.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Data consistently '
                              'shows that formative '
                              'assessment improves '
                              'student achievement '
                              'more than high-stakes '
                              'testing alone.',
                'sentence_b': 'educators must '
                              'redesign assessment '
                              'systems to prioritize '
                              'learning over ranking.',
            },
            {
                'pair_id':    'pair_03',
                'sentence_a': 'Critical reading, '
                              'analytical writing, '
                              'and information '
                              'evaluation are the '
                              'foundational skills '
                              'of the 21st century.',
                'sentence_b': 'institutions that '
                              'neglect these skills '
                              'leave graduates '
                              'unprepared for '
                              'professional and '
                              'civic life.',
            },
        ],
        'transition_tile_dock': [
            'In conclusion', 'Therefore',
            'Ultimately', 'However',
            'Furthermore', 'Nevertheless',
        ],
        'correct_tile_map': {
            'pair_01': 'In conclusion',
            'pair_02': 'Therefore',
            'pair_03': 'Ultimately',
        },
        'tile_error_explanations': {
            'pair_01__Therefore': (
                '"Therefore" is a logical '
                'deduction. This is a broader '
                'policy recommendation — '
                '"in conclusion" closes '
                'the argument better.'),
            'pair_01__However': (
                '"However" signals contrast. '
                'The recommendation follows '
                'from media literacy\'s benefits.'),
            'pair_02__In conclusion': (
                '"In conclusion" closes extended '
                'arguments. This draws a direct '
                'logical policy conclusion — '
                '"therefore" is more precise.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds evidence. '
                'The second sentence draws '
                'a conclusion from evidence.'),
            'pair_03__Therefore': (
                '"Therefore" is logical deduction. '
                'The second sentence asserts final '
                'significance — "ultimately" '
                'captures this better.'),
            'pair_03__Furthermore': (
                '"Furthermore" adds info. '
                'The second sentence concludes '
                'the argument about consequences.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Pair 01 closes an extended '
                    'argument. Pair 02 draws '
                    'a logical policy conclusion. '
                    'Pair 03 states final truth.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"In conclusion": formally '
                    'closes an argument. '
                    '"Therefore": logical '
                    'inference. '
                    '"Ultimately": final truth.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Pair 01: "In conclusion". '
                    'Pair 02: "Therefore". '
                    'Pair 03: "Ultimately".'),
            },
        ],
    },
]


def seed_snap_gap():
    print('\n── Seeding Module 2: Snap-in Gap ──')
    for nd in SNAP_GAP_NODES:
        existing = CoherenceNodeDocument.objects(
            node_id=nd['node_id']).first()
        if existing:
            existing.delete()
            print(f'  Updated: {nd["node_id"]}'
                  f' — {nd["title"]}')
        else:
            print(f'  Seeded:  {nd["node_id"]}'
                  f' — {nd["title"]}')
        CoherenceNodeDocument(**nd).save()


# ══════════════════════════════════════════════
# MODULE 3 — TAP THE CLUES (12 nodes)
# ══════════════════════════════════════════════

TAP_CLUES_NODES = [

    # ── SYNONYM CLUES ─────────────────────────

    {
        'node_id': 'tap_node_01',
        'title':   'Synonym Clues — Basics',
        'focus':   'Find one synonym clue right '
                   'beside the locked word',
        'micro_lesson_text': (
            'A synonym clue gives a word near '
            'the unknown word that means almost '
            'the same thing. The simplest form: '
            'a dash (—) introduces the synonym '
            'immediately after the word. '
            'Look right after the dash for '
            'a word that means the same thing.'
        ),
        'reading_passage': (
            'The children were joyful — happy — '
            'as they ran toward the playground '
            'on the last day of school before '
            'the long summer break began.'
        ),
        'word_count': 27,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'joyful',
                'position_index':   4,
                'correct_clue_ids': ['happy'],
                'definition': (
                    'Feeling or showing great '
                    'happiness and delight.'),
                'contextual_usage': (
                    'The crowd was joyful when '
                    'the team scored the '
                    'winning goal.'),
                'translation': 'masaya',
            },
        ],
        'clue_error_explanations': {
            'w1__children': (
                '"children" identifies who is '
                'feeling joyful, not what '
                'joyful means.'),
            'w1__ran': (
                '"ran" describes what the '
                'children did — it is an action, '
                'not a synonym for joyful.'),
            'w1__playground': (
                '"playground" is where they ran, '
                'not a clue for joyful.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Look for a word right after '
                    'the dash that comes '
                    'immediately after joyful.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'The dash after "joyful" '
                    'introduces its synonym '
                    'directly.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "happy" — it appears '
                    'right after the dash as '
                    'the direct synonym.'),
            },
        ],
    },

    {
        'node_id': 'tap_node_02',
        'title':   'Synonym Clues — Intermediate',
        'focus':   'Find two synonym clues '
                   'in context',
        'micro_lesson_text': (
            'Sometimes a word has two synonym '
            'clues nearby, not just one. '
            'Look for: commas or dashes '
            'introducing synonyms, or pairs of '
            'words connected by "and" that '
            'together describe the meaning. '
            'Both clue words must be tapped '
            'to unlock the locked word.'
        ),
        'reading_passage': (
            'After the long march uphill, the '
            'scouts were weary. Tired and '
            'exhausted, they sat under the shade '
            'of the tallest tree and immediately '
            'fell into a deep sleep.'
        ),
        'word_count': 36,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'weary',
                'position_index':   10,
                'correct_clue_ids': [
                    'tired', 'exhausted'],
                'definition': (
                    'Feeling or showing extreme '
                    'tiredness, especially from '
                    'exertion or effort.'),
                'contextual_usage': (
                    'The weary travelers finally '
                    'arrived at the hotel after '
                    'a twelve-hour journey.'),
                'translation': 'pagod',
            },
        ],
        'clue_error_explanations': {
            'w1__scouts': (
                '"scouts" identifies who is weary, '
                'not what weary means.'),
            'w1__marched': (
                '"marched" describes what they '
                'did before — it is an action, '
                'not a synonym for weary.'),
            'w1__shade': (
                '"shade" is where they sat, '
                'not a synonym for weary.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Two synonym clues appear '
                    'right after the word "weary" '
                    'in the next sentence.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'The sentence after "weary" '
                    'says "Tired and exhausted" '
                    '— both are synonyms.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "tired" and "exhausted" '
                    '— they appear in the very '
                    'next sentence as synonyms.'),
            },
        ],
    },

    {
        'node_id': 'tap_node_03',
        'title':   'Synonym Clues — Advanced',
        'focus':   'Unlock two words using '
                   'synonym clues',
        'micro_lesson_text': (
            'In advanced passages, multiple '
            'locked words each have their own '
            'synonym clues. Each set of clues '
            'is embedded within the same passage. '
            'You must: (1) tap the first locked '
            'word to activate it, (2) find its '
            'synonym clues, then (3) tap the '
            'second locked word and find its '
            'clues. Read the whole passage '
            'carefully first.'
        ),
        'reading_passage': (
            'The climbers faced a daunting — '
            'intimidating and overwhelming — '
            'challenge as they approached the '
            'icy summit. Despite the treacherous '
            'conditions, their guide remained '
            'steadfast, resolute and unwavering '
            'in her commitment to bring the '
            'team safely to the top.'
        ),
        'word_count': 50,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'daunting',
                'position_index':   4,
                'correct_clue_ids': [
                    'intimidating', 'overwhelming'],
                'definition': (
                    'Seeming difficult to deal '
                    'with in prospect; '
                    'intimidating.'),
                'contextual_usage': (
                    'The daunting list of tasks '
                    'made him hesitate before '
                    'starting.'),
                'translation': 'nakakatakot',
            },
            {
                'word_id':          'w2',
                'word':             'steadfast',
                'position_index':   23,
                'correct_clue_ids': [
                    'resolute', 'unwavering'],
                'definition': (
                    'Resolutely firm and '
                    'unwavering in purpose '
                    'or belief.'),
                'contextual_usage': (
                    'She remained steadfast '
                    'in her decision to finish '
                    'the race despite the pain.'),
                'translation': 'matibay ang loob',
            },
        ],
        'clue_error_explanations': {
            'w1__climbers': (
                '"climbers" identifies who faced '
                'the challenge, not what '
                'daunting means.'),
            'w1__summit': (
                '"summit" is where they were '
                'headed, not a synonym '
                'for daunting.'),
            'w2__guide': (
                '"guide" is who was steadfast, '
                'not what steadfast means.'),
            'w2__committed': (
                '"committed" is related but '
                'not one of the direct synonym '
                'clues in this passage.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Both locked words have '
                    'synonym clues right next '
                    'to them inside dashes '
                    'or commas.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"Daunting" has two synonyms '
                    'inside the dashes. '
                    '"Steadfast" has two synonyms '
                    'right after the comma.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Daunting: tap "intimidating" '
                    'and "overwhelming". '
                    'Steadfast: tap "resolute" '
                    'and "unwavering".'),
            },
        ],
    },

    # ── DEFINITION CLUES ──────────────────────

    {
        'node_id': 'tap_node_04',
        'title':   'Definition Clues — Basics',
        'focus':   'Spot a single embedded '
                   'definition clue',
        'micro_lesson_text': (
            'A definition clue directly states '
            'what a word means. The simplest '
            'form uses "meaning" immediately '
            'after the word: "X, meaning Y." '
            'The word after "meaning" is the '
            'definition clue. Tap it to '
            'unlock the locked word.'
        ),
        'reading_passage': (
            'Lola Nena was frugal, meaning she '
            'was careful not to waste money on '
            'things she did not truly need in '
            'her daily life.'
        ),
        'word_count': 28,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'frugal',
                'position_index':   3,
                'correct_clue_ids': ['careful'],
                'definition': (
                    'Being sparing or economical '
                    'with money or resources.'),
                'contextual_usage': (
                    'The frugal student saved '
                    'half of her allowance '
                    'every week.'),
                'translation': 'matipid',
            },
        ],
        'clue_error_explanations': {
            'w1__lola': (
                '"lola" identifies who is frugal, '
                'not what frugal means.'),
            'w1__money': (
                '"money" is what she was careful '
                'about, not the definition '
                'of frugal.'),
            'w1__waste': (
                '"waste" describes what she '
                'avoided doing, not '
                'what frugal means.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'The word after "meaning" '
                    'is the definition clue. '
                    'Find "meaning" in '
                    'the passage.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"frugal, meaning she was '
                    'careful" — the definition '
                    'clue follows "meaning".'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "careful" — it is the '
                    'word right after "meaning" '
                    'that defines frugal.'),
            },
        ],
    },

    {
        'node_id': 'tap_node_05',
        'title':   'Definition Clues — Intermediate',
        'focus':   'Find two definition clue words '
                   'in context',
        'micro_lesson_text': (
            'Definition clues use signal phrases: '
            '"defined as" introduces a formal '
            'definition. "Or" within commas '
            'embeds a restatement. '
            'Sometimes the definition clue '
            'is a phrase with two key words '
            'that together define the term. '
            'Tap both words to unlock the '
            'locked word.'
        ),
        'reading_passage': (
            'Scientists study resilience, defined '
            'as the ability to recover and adapt '
            'quickly from setbacks, in communities '
            'affected by natural disasters in '
            'the region.'
        ),
        'word_count': 31,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'resilience',
                'position_index':   2,
                'correct_clue_ids': [
                    'recover', 'adapt'],
                'definition': (
                    'The ability to recover '
                    'quickly from difficulties '
                    'or setbacks.'),
                'contextual_usage': (
                    'The community showed '
                    'resilience by rebuilding '
                    'their homes after '
                    'the typhoon.'),
                'translation': 'katatagan',
            },
        ],
        'clue_error_explanations': {
            'w1__scientists': (
                '"scientists" identifies who '
                'studies resilience, not what '
                'it means.'),
            'w1__communities': (
                '"communities" is where '
                'resilience is studied, '
                'not its definition.'),
            'w1__disasters': (
                '"disasters" describes the '
                'context for study, not '
                'the definition of resilience.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Look for "defined as" in '
                    'the passage. The definition '
                    'follows immediately after.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    '"defined as the ability to '
                    'recover and adapt" — two '
                    'key words define resilience.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "recover" and "adapt" — '
                    'they are the two parts of '
                    'the embedded definition.'),
            },
        ],
    },

    {
        'node_id': 'tap_node_06',
        'title':   'Definition Clues — Advanced',
        'focus':   'Unlock two words using '
                   'definition clues',
        'micro_lesson_text': (
            'Academic passages embed definitions '
            'for multiple terms simultaneously. '
            'Each locked word has its own '
            'definition clue using different '
            'signal phrases: "which refers to", '
            '"or the tendency to", commas, and '
            'relative clauses. Read carefully '
            'to match each signal to '
            'its locked word.'
        ),
        'reading_passage': (
            'When evaluating sources for research, '
            'readers must assess each source\'s '
            'credibility, which refers to its '
            'trustworthiness and reliability '
            'as a verified information provider. '
            'Readers must also identify bias, '
            'or the tendency to favor one '
            'perspective unfairly, which often '
            'distorts the accuracy of the '
            'information presented.'
        ),
        'word_count': 58,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'credibility',
                'position_index':   8,
                'correct_clue_ids': [
                    'trustworthiness', 'reliability'],
                'definition': (
                    'The quality of being trusted '
                    'and believed in; '
                    'trustworthiness.'),
                'contextual_usage': (
                    'The journalist\'s credibility '
                    'was questioned after '
                    'the error.'),
                'translation': 'kredibilidad',
            },
            {
                'word_id':          'w2',
                'word':             'bias',
                'position_index':   28,
                'correct_clue_ids': [
                    'tendency', 'favor'],
                'definition': (
                    'An inclination to favor one '
                    'side or perspective '
                    'unfairly.'),
                'contextual_usage': (
                    'The article showed clear '
                    'bias toward one '
                    'political party.'),
                'translation': 'pagkiling',
            },
        ],
        'clue_error_explanations': {
            'w1__sources': (
                '"sources" is what has credibility, '
                'not the definition of it.'),
            'w1__research': (
                '"research" is the purpose of '
                'evaluating sources, not '
                'a clue for credibility.'),
            'w2__perspective': (
                '"perspective" is what bias '
                'favors, but it is not one '
                'of the direct definition '
                'clue words here.'),
            'w2__accuracy': (
                '"accuracy" is what bias '
                'distorts, not the definition '
                'of bias itself.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Each locked word has a '
                    'different signal. "Which '
                    'refers to" for the first. '
                    '"Or the tendency to" '
                    'for the second.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Credibility: "which refers '
                    'to its trustworthiness and '
                    'reliability." '
                    'Bias: "or the tendency '
                    'to favor."'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Credibility: tap '
                    '"trustworthiness" and '
                    '"reliability". '
                    'Bias: tap "tendency" '
                    'and "favor".'),
            },
        ],
    },

    # ── ANTONYM & CONTRAST CLUES ──────────────

    {
        'node_id': 'tap_node_07',
        'title':   'Antonym & Contrast Clues — '
                   'Basics',
        'focus':   'Find one antonym clue '
                   'near the locked word',
        'micro_lesson_text': (
            'An antonym clue gives a word that '
            'means the OPPOSITE of the unknown '
            'word. Signal word: "unlike". '
            'When "unlike X... Y" appears, '
            'Y is the opposite of X. '
            'Use the opposite to infer '
            'what X means.'
        ),
        'reading_passage': (
            'Unlike his timid younger brother '
            'who cried at the school gate, '
            'Carlos was bold as he walked '
            'confidently into his very first '
            'day of high school.'
        ),
        'word_count': 30,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'timid',
                'position_index':   3,
                'correct_clue_ids': ['bold'],
                'definition': (
                    'Showing a lack of courage '
                    'or confidence; '
                    'easily frightened.'),
                'contextual_usage': (
                    'The timid puppy hid behind '
                    'its owner whenever '
                    'strangers approached.'),
                'translation': 'mahiyain',
            },
        ],
        'clue_error_explanations': {
            'w1__brother': (
                '"brother" identifies who is '
                'timid, not the meaning '
                'of timid.'),
            'w1__cried': (
                '"cried" describes what the '
                'brother did, but the key '
                'antonym clue is the '
                'direct opposite word.'),
            'w1__confidently': (
                '"confidently" describes how '
                'Carlos walked — it is related '
                'but not the direct antonym '
                'clue used here.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    '"Unlike his timid brother, '
                    'Carlos was..." — the word '
                    'describing Carlos is the '
                    'opposite of timid.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'The word right after '
                    '"Carlos was" is the '
                    'direct antonym of timid.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "bold" — it directly '
                    'contrasts with timid '
                    'in the same sentence.'),
            },
        ],
    },

    {
        'node_id': 'tap_node_08',
        'title':   'Antonym & Contrast Clues — '
                   'Intermediate',
        'focus':   'Find two antonym clues in '
                   'academic context',
        'micro_lesson_text': (
            'Sometimes the antonym clue is not '
            'a single word but described through '
            'contrasting behavior. Signal words: '
            '"but", "while", "in contrast". '
            'When two characters behave in '
            'opposite ways, the words describing '
            'the second character\'s behavior '
            'are antonym clues for the '
            'first character\'s trait.'
        ),
        'reading_passage': (
            'While most committee members were '
            'apathetic about the new policy, '
            'refusing to read documents or attend '
            'meetings, the student representative '
            'was passionate and enthusiastic, '
            'staying after class to discuss '
            'every detail of the proposal.'
        ),
        'word_count': 42,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'apathetic',
                'position_index':   5,
                'correct_clue_ids': [
                    'passionate', 'enthusiastic'],
                'definition': (
                    'Showing or feeling no '
                    'interest, enthusiasm, '
                    'or concern.'),
                'contextual_usage': (
                    'The crowd grew apathetic '
                    'after the team lost five '
                    'games in a row.'),
                'translation': 'walang pakialam',
            },
        ],
        'clue_error_explanations': {
            'w1__committee': (
                '"committee" identifies who '
                'is apathetic, not its meaning.'),
            'w1__meetings': (
                '"meetings" is what they refused '
                'to attend — it is not an '
                'antonym clue.'),
            'w1__representative': (
                '"representative" identifies '
                'the contrasting person, not '
                'the antonym of apathetic.'),
                },
                'scaffold_hints': [
                    {
                        'tier': 1,
                        'hint_text': (
                            'The student representative '
                            'is described as the opposite '
                            'of the apathetic members. '
                            'What words describe her?'),
                    },
                    {
                        'tier': 2,
                        'hint_text': (
                            'The representative was the '
                            'opposite — she was '
                            '"passionate and enthusiastic". '
                            'Both are antonym clues.'),
                    },
                    {
                        'tier': 3,
                        'hint_text': (
                            'Tap "passionate" and '
                            '"enthusiastic" — they are '
                            'the direct opposites of '
                            'apathetic in this passage.'),
                    },
                ],
            },  # ← closes tap_node_08
        {
    'node_id': 'tap_node_09',
    'title':   'Antonym & Contrast Clues — '
               'Advanced',
    'focus':   'Unlock two words using '
               'antonym clues',
    'micro_lesson_text': (
        'Advanced passages have multiple '
        'locked words, each with their own '
        'antonym clues embedded through '
        'contrast structures. Look for: '
        '"unlike X...", "rather than", '
        '"in contrast", "whereas". '
        'Each locked word has specific '
        'antonym clues — do not mix '
        'up which clues belong to '
        'which word.'
    ),
    'reading_passage': (
        'Unlike her verbose classmates who '
        'rambled on for several minutes, '
        'Ana\'s presentation was concise — '
        'she covered every key point in '
        'under two minutes. Similarly, '
        'while most speakers were ambiguous '
        'in their recommendations, Ana\'s '
        'conclusions were clear and precise, '
        'leaving no room for misinterpretation.'
    ),
    'word_count': 55,
    'locked_words': [
        {
            'word_id':          'w1',
            'word':             'verbose',
            'position_index':   3,
            'correct_clue_ids': [
                'concise'],
            'definition': (
                'Using more words than '
                'necessary; wordy.'),
            'contextual_usage': (
                'His verbose response confused '
                'the audience instead of '
                'clarifying the point.'),
            'translation': 'malapastol',
        },
        {
            'word_id':          'w2',
            'word':             'ambiguous',
            'position_index':   30,
            'correct_clue_ids': [
                'clear', 'precise'],
            'definition': (
                'Open to more than one '
                'interpretation; not '
                'having one obvious meaning.'),
            'contextual_usage': (
                'The ambiguous instructions '
                'caused students to answer '
                'the question differently.'),
            'translation': 'malabo',
        },
    ],
    'clue_error_explanations': {
        'w1__rambled': (
            '"rambled" describes the same '
            'behavior as verbose — it is '
            'not an antonym clue.'),
        'w1__presentation': (
            '"presentation" is what was '
            'concise, not a clue for '
            'what verbose means.'),
        'w2__speakers': (
            '"speakers" identifies who '
            'was ambiguous, not '
            'its meaning.'),
        'w2__misinterpretation': (
            '"misinterpretation" is what '
            'was avoided — not a direct '
            'antonym for ambiguous.'),
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'Verbose is contrasted with '
                'how Ana spoke. Ambiguous '
                'is contrasted with how '
                'her conclusions were.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Ana\'s speech was the '
                'opposite of verbose. '
                'Her conclusions were '
                'the opposite of ambiguous.'),
        },
        {
            'tier': 3,
            'hint_text': (
                'Verbose: tap "concise". '
                'Ambiguous: tap "clear" '
                'and "precise".'),
        },
    ],
},

# ── EXAMPLE & INFERENCE CLUES ─────────────

{
    'node_id': 'tap_node_10',
    'title':   'Example & Inference Clues — '
               'Basics',
    'focus':   'Infer word meaning from one '
               'nearby example',
    'micro_lesson_text': (
        'An inference clue gives a scenario '
        'or example that hints at the meaning. '
        'It does not directly define the word '
        'but describes how someone with that '
        'quality behaves. Read the behavior '
        'and ask: what emotion or quality '
        'does this behavior suggest?'
    ),
    'reading_passage': (
        'The toddler was petulant all morning '
        '— she cried every time her mother '
        'said no, threw her toys on the floor '
        'when she could not have her way, and '
        'refused to eat her breakfast.'
    ),
    'word_count': 36,
    'locked_words': [
        {
            'word_id':          'w1',
            'word':             'petulant',
            'position_index':   3,
            'correct_clue_ids': ['cried'],
            'definition': (
                'Childishly sulky or bad-'
                'tempered when one does not '
                'get one\'s way.'),
            'contextual_usage': (
                'The petulant child refused '
                'to share his toys with '
                'the other students.'),
            'translation': 'maarte',
        },
    ],
    'clue_error_explanations': {
        'w1__toddler': (
            '"toddler" identifies who is '
            'petulant, not what it means.'),
        'w1__mother': (
            '"mother" is who said no — '
            'not a clue for petulant.'),
        'w1__breakfast': (
            '"breakfast" is what she refused '
            'to eat — it describes the '
            'situation, not the emotion.'),
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'What did the toddler do? '
                'Her behavior shows what '
                'petulant means. Look for '
                'an emotional action word.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'The first example of '
                'petulant behavior: '
                '"she cried every time '
                'her mother said no."'),
        },
        {
            'tier': 3,
            'hint_text': (
                'Tap "cried" — it is the '
                'first and most direct '
                'example of petulant '
                'behavior in the passage.'),
        },
    ],
},

{
    'node_id': 'tap_node_11',
    'title':   'Example & Inference Clues — '
               'Intermediate',
    'focus':   'Infer meaning from two '
               'example clues',
    'micro_lesson_text': (
        'Inference clues describe behaviors '
        'that together define the quality. '
        'When a passage gives a scenario '
        'with multiple actions, look for '
        'the feeling words — adverbs and '
        'adjectives that describe HOW '
        'characters behave. These are '
        'your clue words.'
    ),
    'reading_passage': (
        'The students were in a state of '
        'consternation after the announcement '
        '— some paced the hallways nervously, '
        'others sat frozen at their desks, '
        'and several began whispering '
        'anxiously about what would happen. '
        'No one could focus on their work.'
    ),
    'word_count': 46,
    'locked_words': [
        {
            'word_id':          'w1',
            'word':             'consternation',
            'position_index':   7,
            'correct_clue_ids': [
                'nervously', 'anxiously'],
            'definition': (
                'A feeling of anxiety or '
                'dismay, typically caused '
                'by something unexpected.'),
            'contextual_usage': (
                'The sudden power outage '
                'caused consternation among '
                'the hospital staff.'),
            'translation': 'pagkabagabag',
        },
    ],
    'clue_error_explanations': {
        'w1__paced': (
            '"paced" describes an action, '
            'not a feeling. Look for '
            'words that describe the '
            'emotional state.'),
        'w1__frozen': (
            '"frozen" describes a physical '
            'reaction, not the emotional '
            'feeling of consternation.'),
        'w1__whispering': (
            '"whispering" is an action. '
            'Look for adverbs that describe '
            'the emotional tone.'),
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'The examples show how '
                'students are feeling. '
                'Look for feeling words '
                'that modify the actions.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Look for adverbs near the '
                'action words that describe '
                'the emotional state.'),
        },
        {
            'tier': 3,
            'hint_text': (
                'Tap "nervously" and '
                '"anxiously" — they are '
                'the feeling words that '
                'define consternation.'),
        },
    ],
},

{
    'node_id': 'tap_node_12',
    'title':   'Example & Inference Clues — '
               'Advanced',
    'focus':   'Unlock two words using '
               'inference clues',
    'micro_lesson_text': (
        'Advanced inference passages require '
        'you to infer the meaning of two '
        'different academic words from the '
        'same passage. Each word has its '
        'own set of inference clue words '
        'embedded in the examples. '
        'Read the full passage before '
        'selecting which locked word '
        'to tap first.'
    ),
    'reading_passage': (
        'The researcher was meticulous in her '
        'methodology — she checked every data '
        'point thoroughly, documented each '
        'step precisely, and verified every '
        'result multiple times before drawing '
        'any conclusions. Her colleague, '
        'however, was nonchalant about the '
        'same process, often skipping steps '
        'carelessly and submitting results '
        'without verification.'
    ),
    'word_count': 58,
    'locked_words': [
        {
            'word_id':          'w1',
            'word':             'meticulous',
            'position_index':   3,
            'correct_clue_ids': [
                'thoroughly', 'precisely'],
            'definition': (
                'Showing great attention to '
                'detail; very careful and '
                'precise.'),
            'contextual_usage': (
                'The meticulous editor '
                'caught every grammatical '
                'error in the manuscript.'),
            'translation': 'maingat',
        },
        {
            'word_id':          'w2',
            'word':             'nonchalant',
            'position_index':   30,
            'correct_clue_ids': [
                'carelessly', 'skipping'],
            'definition': (
                'Feeling or appearing '
                'casually calm and relaxed; '
                'not displaying anxiety.'),
            'contextual_usage': (
                'He was nonchalant about '
                'the exam, barely glancing '
                'at his notes the night '
                'before.'),
            'translation': 'walang pakialam',
        },
    ],
    'clue_error_explanations': {
        'w1__researcher': (
            '"researcher" identifies who '
            'is meticulous, not what '
            'it means.'),
        'w1__data': (
            '"data" is what she checked, '
            'not a clue for how she did it.'),
        'w2__colleague': (
            '"colleague" identifies who '
            'is nonchalant, not '
            'its meaning.'),
        'w2__verification': (
            '"verification" is what she '
            'skipped, not how she behaved.'),
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'Meticulous is shown through '
                'how carefully she worked. '
                'Nonchalant is shown through '
                'how carelessly he worked.'),
        },
            {
                'tier': 2,
                'hint_text': (
                    'Look for adverbs that '
                    'describe how each person '
                    'worked — those are '
                    'your clue words.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Meticulous: tap "thoroughly" '
                    'and "precisely". '
                    'Nonchalant: tap "carelessly" '
                    'and "skipping".'),
            },
        ],
    },
]

def seed_tap_clues():
        print('\n── Seeding Module 3: Tap the Clues ──')
        for nd in TAP_CLUES_NODES:
            # Indent everything inside the loop by 4 spaces
            existing = VocabularyNodeDocument.objects(node_id=nd['node_id']).first()
            
            if existing:
                # Indent everything inside the 'if' block
                existing.delete()
                print(f'   Updated: {nd["node_id"]} — {nd["title"]}')
            else:
                # Indent everything inside the 'else' block
                print(f'   Seeded:  {nd["node_id"]} — {nd["title"]}')
            
            # Save needs to be inside the for loop, at the same indentation as 'if/else'
            VocabularyNodeDocument(**nd).save()


FACT_SCANNER_NODES = [
# ── CURRENCY ──────────────────────────────

{
    'node_id':         'fac_node_01',
    'title':           'Currency — Basics',
    'focus':           'Spot a very obviously '
                       'outdated source',
    'craap_criterion': 'CURRENCY',
    'micro_lesson_text': (
        'Currency asks: Is this information '
        'up to date? The most obvious '
        'currency violations cite a very old '
        'year (30+ years ago) while making '
        'a claim about the present. '
        'If a sentence cites a study from '
        'decades ago as if it applies today, '
        'it fails Currency.'
    ),
    'reading_passage': (
        'Vaccines have played a crucial role '
        'in eliminating many diseases. '
        'Medical technology improves '
        'significantly every decade. '
        'According to a 1962 study, the '
        'polio vaccine is still experimental '
        'and its long-term effects are '
        'unknown. Modern vaccines undergo '
        'strict clinical trials before '
        'approval. Global vaccination '
        'coverage continues to expand.'
    ),
    'word_count': 62,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Vaccines have played a '
                    'crucial role in '
                    'eliminating many diseases.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Medical technology '
                    'improves significantly '
                    'every decade.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'According to a 1962 study, '
                    'the polio vaccine is still '
                    'experimental and its '
                    'long-term effects are '
                    'unknown.',
            'is_flawed':   True,
            'flaw_reason': (
                'This cites a 1962 study — '
                'over 60 years old. The '
                'polio vaccine has been '
                'proven safe and effective '
                'for decades. This is an '
                'extreme Currency violation.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Modern vaccines undergo '
                    'strict clinical trials '
                    'before approval.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Global vaccination '
                    'coverage continues '
                    'to expand.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'A well-established historical '
              'fact. Not a currency issue.',
        's2': 'A general true statement '
              'about technology. Current.',
        's4': 'Accurately describes current '
              'regulatory processes.',
        's5': 'A current, verifiable '
              'global health trend.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'Look for a sentence that '
                'cites a very specific old '
                'year. That is the '
                'currency violation.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A sentence cites a "1962 '
                'study." Anything from over '
                '60 years ago claiming '
                'current relevance fails '
                'Currency.'),
        },
        {
            'tier': 3,
            'hint_text': (
                'The sentence starting with '
                '"According to a 1962 study" '
                'is the violation. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_02',
    'title':           'Currency — Intermediate',
    'focus':           'Identify a moderately '
                       'outdated source',
    'craap_criterion': 'CURRENCY',
    'micro_lesson_text': (
        'Currency violations are not always '
        'from 60 years ago. A study from '
        '20–30 years ago can still fail '
        'Currency in fast-changing fields '
        'like technology, medicine, and '
        'social science. Ask: has enough '
        'changed in this field that this '
        'source is no longer reliable?'
    ),
    'reading_passage': (
        'Climate change is an urgent global '
        'issue requiring immediate action. '
        'Scientists warn that average global '
        'temperatures have risen significantly '
        'over the past century. '
        'According to a 1975 study, the Earth '
        'will experience minimal warming over '
        'the next fifty years. '
        'Renewable energy adoption has '
        'accelerated dramatically recently. '
        'Governments worldwide are implementing '
        'carbon reduction policies.'
    ),
    'word_count': 71,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Climate change is an '
                    'urgent global issue '
                    'requiring immediate '
                    'action.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Scientists warn that '
                    'average global '
                    'temperatures have risen '
                    'significantly over the '
                    'past century.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'According to a 1975 study, '
                    'the Earth will experience '
                    'minimal warming over the '
                    'next fifty years.',
            'is_flawed':   True,
            'flaw_reason': (
                'Cites a 1975 study — '
                '50 years old. Climate '
                'science has advanced '
                'significantly. This fails '
                'Currency.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Renewable energy adoption '
                    'has accelerated '
                    'dramatically recently.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Governments worldwide '
                    'are implementing carbon '
                    'reduction policies.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Current, widely accepted '
              'scientific consensus.',
        's2': 'Reflects current scientific '
              'findings accurately.',
        's4': 'A current, verifiable '
              'energy trend.',
        's5': 'Current global policy '
              'reality.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence mentions a '
                'specific old year. Currency '
                'means checking how recent '
                'the source is.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Look for a sentence citing '
                'a study from the 1970s. '
                'Climate science from '
                '50 years ago is not '
                'reliable today.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"According to a 1975 study" '
                'is the currency violation. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_03',
    'title':           'Currency — Advanced',
    'focus':           'Detect a subtly '
                       'outdated claim',
    'craap_criterion': 'CURRENCY',
    'micro_lesson_text': (
        'Advanced currency violations are '
        'subtle — the sentence does not '
        'cite a year but references a '
        'technology, policy, or statistic '
        'that is clearly outdated compared '
        'to current knowledge. You must '
        'apply your understanding of '
        'currency as a concept, not '
        'just look for a year.'
    ),
    'reading_passage': (
        'Digital communication has '
        'fundamentally transformed modern '
        'workplaces. Remote work tools '
        'allow teams to collaborate across '
        'continents in real time. '
        'Fax machines remain the primary '
        'tool for secure business '
        'communication in corporate settings. '
        'Cloud computing has reduced the '
        'need for physical server rooms. '
        'Artificial intelligence is being '
        'integrated into daily workflows '
        'across industries.'
    ),
    'word_count': 68,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Digital communication '
                    'has fundamentally '
                    'transformed modern '
                    'workplaces.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Remote work tools allow '
                    'teams to collaborate '
                    'across continents '
                    'in real time.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Fax machines remain the '
                    'primary tool for secure '
                    'business communication '
                    'in corporate settings.',
            'is_flawed':   True,
            'flaw_reason': (
                'Fax machines have been '
                'largely replaced by '
                'encrypted email, digital '
                'signatures, and secure '
                'cloud platforms. This '
                'statement is outdated — '
                'a subtle Currency violation.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Cloud computing has '
                    'reduced the need for '
                    'physical server rooms.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Artificial intelligence '
                    'is being integrated into '
                    'daily workflows across '
                    'industries.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Accurately reflects current '
              'workplace realities.',
        's2': 'Describes a current and '
              'widely used technology.',
        's4': 'A current, accurate '
              'observation about IT trends.',
        's5': 'A current, widely '
              'documented trend.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence describes '
                'a technology that was '
                'common decades ago but '
                'is rarely used today.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Think about which '
                'technology in the passage '
                'is no longer the "primary" '
                'tool in modern workplaces.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Fax machines remain the '
                'primary tool" is the '
                'outdated claim. '
                'Quarantine it.'),
        },
    ],
},

# ── RELEVANCE ─────────────────────────────

{
    'node_id':         'fac_node_04',
    'title':           'Relevance — Basics',
    'focus':           'Spot a completely '
                       'off-topic sentence',
    'craap_criterion': 'RELEVANCE',
    'micro_lesson_text': (
        'Relevance asks: does this sentence '
        'relate to the topic of the article? '
        'The most obvious violation: a '
        'sentence about a completely '
        'different subject. If every other '
        'sentence is about Topic A but one '
        'is about Topic B — quarantine it.'
    ),
    'reading_passage': (
        'Critical reading is an essential '
        'skill for academic success. '
        'Students who read critically '
        'evaluate sources and build '
        'stronger arguments. '
        'The history of football in the '
        'Philippines dates back to the '
        'American colonial period. '
        'Developing critical reading '
        'requires consistent practice. '
        'Teachers model analytical reading '
        'for their students.'
    ),
    'word_count': 58,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Critical reading is an '
                    'essential skill for '
                    'academic success.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Students who read '
                    'critically evaluate '
                    'sources and build '
                    'stronger arguments.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'The history of football '
                    'in the Philippines dates '
                    'back to the American '
                    'colonial period.',
            'is_flawed':   True,
            'flaw_reason': (
                'Completely off-topic. '
                'The article is about '
                'critical reading — '
                'football history has '
                'no relevance here.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Developing critical '
                    'reading requires '
                    'consistent practice.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Teachers model analytical '
                    'reading for their '
                    'students.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Directly introduces the '
              'article topic.',
        's2': 'Supports the topic — '
              'benefits of critical reading.',
        's4': 'On-topic — how to develop '
              'critical reading.',
        's5': 'Relevant — the teacher\'s '
              'role in reading.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence is about a '
                'completely different subject. '
                'Does every sentence relate '
                'to critical reading?'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Most sentences are about '
                'reading skills. One is about '
                'a sport — clearly off-topic.'),
        },
        {
            'tier': 3,
            'hint_text': (
                'The sentence about football '
                'in the Philippines has '
                'nothing to do with '
                'critical reading.'),
        },
    ],
},

{
    'node_id':         'fac_node_05',
    'title':           'Relevance — Intermediate',
    'focus':           'Identify a moderately '
                       'off-topic sentence',
    'craap_criterion': 'RELEVANCE',
    'micro_lesson_text': (
        'Some relevance violations are '
        'less obvious. The off-topic sentence '
        'may discuss a related subject but '
        'still fail relevance because it '
        'does not address the specific '
        'focus of the article. Ask: does '
        'this sentence answer the same '
        'question the rest of the '
        'article is addressing?'
    ),
    'reading_passage': (
        'Mindful reading improves student '
        'comprehension and retention. '
        'Students who annotate texts as '
        'they read develop stronger critical '
        'thinking skills over time. '
        'The average adult reads '
        'approximately 200 words per minute '
        'depending on the difficulty of '
        'the material. '
        'Previewing headings and summaries '
        'before reading activates relevant '
        'prior knowledge. '
        'Reflecting on a text after reading '
        'deepens long-term retention.'
    ),
    'word_count': 68,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Mindful reading improves '
                    'student comprehension '
                    'and retention.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Students who annotate '
                    'texts develop stronger '
                    'critical thinking skills.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'The average adult reads '
                    'approximately 200 words '
                    'per minute depending on '
                    'the difficulty of '
                    'the material.',
            'is_flawed':   True,
            'flaw_reason': (
                'This is a general fact '
                'about reading speed — not '
                'relevant to the specific '
                'topic of mindful reading '
                'strategies for students. '
                'It fails Relevance.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Previewing headings '
                    'before reading activates '
                    'relevant prior knowledge.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Reflecting on a text '
                    'after reading deepens '
                    'long-term retention.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Directly introduces the '
              'article focus.',
        's2': 'Relevant strategy for '
              'mindful reading.',
        's4': 'A relevant reading strategy.',
        's5': 'A relevant mindful '
              'reading practice.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'The article is about mindful '
                'reading strategies. One '
                'sentence is a general fact '
                'that does not help readers '
                'learn a strategy.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A fact about reading speed '
                'does not tell you HOW to '
                'read more mindfully. '
                'It is off-topic.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"The average adult reads '
                '200 words per minute" is '
                'off-topic for this article. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_06',
    'title':           'Relevance — Advanced',
    'focus':           'Detect a subtly '
                       'irrelevant sentence',
    'craap_criterion': 'RELEVANCE',
    'micro_lesson_text': (
        'Advanced relevance violations are '
        'hard to spot because the off-topic '
        'sentence discusses a genuinely '
        'related topic — but it is aimed at '
        'the wrong audience or addresses a '
        'different question. Ask: does '
        'this sentence help THIS specific '
        'audience understand THIS '
        'specific issue?'
    ),
    'reading_passage': (
        'Critical reading programs in '
        'Grade 11 build the foundational '
        'skills students need for tertiary '
        'education. Identifying text '
        'structure helps students locate '
        'information efficiently in '
        'academic texts. '
        'Professional lawyers spend an '
        'average of six hours daily reading '
        'and analyzing legal documents. '
        'Evaluating source credibility '
        'prepares students to conduct '
        'independent research. '
        'Analyzing author purpose develops '
        'awareness of persuasive techniques '
        'in media.'
    ),
    'word_count': 74,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Critical reading programs '
                    'in Grade 11 build '
                    'foundational skills '
                    'for tertiary education.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Identifying text structure '
                    'helps students locate '
                    'information efficiently '
                    'in academic texts.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Professional lawyers spend '
                    'an average of six hours '
                    'daily reading and '
                    'analyzing legal documents.',
            'is_flawed':   True,
            'flaw_reason': (
                'This is about professional '
                'lawyers, not Grade 11 '
                'students. The article is '
                'about student critical '
                'reading — this information '
                'targets the wrong audience '
                'and fails Relevance.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Evaluating source '
                    'credibility prepares '
                    'students to conduct '
                    'independent research.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Analyzing author purpose '
                    'develops awareness of '
                    'persuasive techniques '
                    'in media.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Introduces the specific '
              'audience and purpose.',
        's2': 'Relevant skill for '
              'Grade 11 students.',
        's4': 'Relevant to the article\'s '
              'student audience.',
        's5': 'Relevant skill and '
              'audience match.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'This article is for '
                'Grade 11 students. One '
                'sentence is about a '
                'professional group, not '
                'students.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A fact about professional '
                'lawyers does not help '
                'Grade 11 students understand '
                'critical reading.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Professional lawyers spend '
                'six hours reading..." is '
                'for the wrong audience. '
                'Quarantine it.'),
        },
    ],
},

# ── AUTHORITY ─────────────────────────────

{
    'node_id':         'fac_node_07',
    'title':           'Authority — Basics',
    'focus':           'Spot an obviously '
                       'unverified claim',
    'craap_criterion': 'AUTHORITY',
    'micro_lesson_text': (
        'Authority asks: who said this? '
        'The most obvious violation: '
        '"experts say" or "people say" '
        'without naming any expert, '
        'institution, or study. '
        'If you cannot identify WHO '
        'made the claim, the source '
        'has no authority.'
    ),
    'reading_passage': (
        'Vaccination programs have '
        'eliminated diseases like smallpox. '
        'The World Health Organization '
        'recommends routine immunization '
        'for all children. '
        'Experts say vaccines cause more '
        'harm than good and should be '
        'avoided by healthy people. '
        'Clinical trials confirm that '
        'approved vaccines are safe. '
        'Public health campaigns continue '
        'to increase vaccination coverage.'
    ),
    'word_count': 60,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Vaccination programs have '
                    'eliminated diseases '
                    'like smallpox.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'The World Health '
                    'Organization recommends '
                    'routine immunization '
                    'for all children.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Experts say vaccines '
                    'cause more harm than '
                    'good and should be '
                    'avoided by healthy people.',
            'is_flawed':   True,
            'flaw_reason': (
                '"Experts say" without naming '
                'any expert, study, or '
                'institution. This is a '
                'vague unverified authority '
                'claim — a classic CRAAP '
                'Authority failure.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Clinical trials confirm '
                    'that approved vaccines '
                    'are safe.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Public health campaigns '
                    'continue to increase '
                    'vaccination coverage.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Verifiable historical '
              'medical fact.',
        's2': 'WHO is a credible, '
              'named authority.',
        's4': 'Clinical trials are a '
              'credible authority source.',
        's5': 'General statement about '
              'ongoing health programs.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence makes a strong '
                'claim but does not name '
                'who said it.'),
        },
        {
            'tier': 2,
            'hint_text': (
                '"Experts say" without naming '
                'which experts or any source '
                'fails Authority.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Experts say vaccines cause '
                'more harm..." has no named '
                'expert. Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_08',
    'title':           'Authority — Intermediate',
    'focus':           'Identify a moderately '
                       'unverified source',
    'craap_criterion': 'AUTHORITY',
    'micro_lesson_text': (
        'A moderately unverified claim names '
        'a source that sounds legitimate but '
        'is not a recognized authority in '
        'the field being discussed. '
        'A blogger, a social media account, '
        'or an anonymous website are not '
        'credible authorities for medical, '
        'scientific, or academic claims.'
    ),
    'reading_passage': (
        'Mental health is increasingly '
        'recognized as essential to overall '
        'student wellbeing. School counselors '
        'provide vital support for students '
        'experiencing stress and anxiety. '
        'According to a popular wellness '
        'blogger, students who meditate for '
        'ten minutes daily will eliminate '
        'all anxiety permanently. '
        'Peer support programs have been '
        'shown to reduce feelings of '
        'isolation among students. '
        'Professional counseling improves '
        'long-term mental health outcomes.'
    ),
    'word_count': 72,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Mental health is '
                    'increasingly recognized '
                    'as essential to overall '
                    'student wellbeing.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'School counselors provide '
                    'vital support for students '
                    'experiencing stress '
                    'and anxiety.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'According to a popular '
                    'wellness blogger, students '
                    'who meditate for ten '
                    'minutes daily will '
                    'eliminate all anxiety '
                    'permanently.',
            'is_flawed':   True,
            'flaw_reason': (
                'A "popular wellness blogger" '
                'is not a credible authority '
                'for mental health claims. '
                'This also contains a wildly '
                'exaggerated claim — fails '
                'both Authority and Accuracy.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Peer support programs '
                    'reduce feelings of '
                    'isolation among students.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Professional counseling '
                    'improves long-term mental '
                    'health outcomes.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'A widely accepted, '
              'evidence-based claim.',
        's2': 'School counselors are '
              'credible professional '
              'sources.',
        's4': 'Supported by educational '
              'research programs.',
        's5': 'Supported by mental health '
              'research literature.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence cites a source '
                'that is not an expert in '
                'the field being discussed.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A "wellness blogger" is not '
                'a credible authority for '
                'medical mental health claims.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"According to a popular '
                'wellness blogger..." is the '
                'authority violation. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_09',
    'title':           'Authority — Advanced',
    'focus':           'Detect a subtly '
                       'unqualified claim',
    'craap_criterion': 'AUTHORITY',
    'micro_lesson_text': (
        'Advanced authority violations are '
        'subtle — the source sounds official '
        'but lacks specific credentials for '
        'the claim being made. A retired '
        'professional, an adjacent field '
        'expert, or a source speaking '
        'outside their expertise all fail '
        'authority. Ask: is this source '
        'actually qualified to make '
        'THIS specific claim?'
    ),
    'reading_passage': (
        'Nutritional science has evolved '
        'significantly over the past decade. '
        'Registered dietitians provide '
        'evidence-based dietary guidance '
        'for managing chronic conditions. '
        'According to a retired gym coach, '
        'eliminating all carbohydrates '
        'from one\'s diet permanently cures '
        'type 2 diabetes within six months. '
        'Peer-reviewed nutrition journals '
        'publish ongoing research on '
        'dietary interventions. '
        'Medical doctors collaborate with '
        'dietitians to develop '
        'treatment plans.'
    ),
    'word_count': 73,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Nutritional science '
                    'has evolved significantly '
                    'over the past decade.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Registered dietitians '
                    'provide evidence-based '
                    'dietary guidance for '
                    'managing chronic '
                    'conditions.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'According to a retired '
                    'gym coach, eliminating '
                    'all carbohydrates '
                    'permanently cures type '
                    '2 diabetes within '
                    'six months.',
            'is_flawed':   True,
            'flaw_reason': (
                'A retired gym coach is not '
                'a qualified medical or '
                'nutritional authority for '
                'diabetes treatment claims. '
                'This also contains an '
                'inaccurate absolute claim. '
                'Fails Authority.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Peer-reviewed nutrition '
                    'journals publish ongoing '
                    'research on dietary '
                    'interventions.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Medical doctors collaborate '
                    'with dietitians to develop '
                    'treatment plans.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'A general true statement '
              'about the field.',
        's2': 'Registered dietitians are '
              'credible authorities.',
        's4': 'Peer-reviewed journals are '
              'a credible authority.',
        's5': 'Medical professionals are '
              'credible authorities.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence cites someone '
                'who sounds qualified but '
                'is not an expert in '
                'the specific medical claim.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A retired gym coach is not '
                'qualified to make medical '
                'claims about diabetes '
                'treatment.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"According to a retired gym '
                'coach..." is the authority '
                'violation. Quarantine it.'),
        },
    ],
},

# ── ACCURACY ──────────────────────────────

{
    'node_id':         'fac_node_10',
    'title':           'Accuracy — Basics',
    'focus':           'Spot a wildly '
                       'inaccurate claim',
    'craap_criterion': 'ACCURACY',
    'micro_lesson_text': (
        'Accuracy asks: is this claim true '
        'and verifiable? The most obvious '
        'violation: a claim that is '
        'impossible, statistically '
        'absurd, or clearly contradicts '
        'widely known facts. '
        'If a claim sounds too extreme '
        'to be real — it probably fails '
        'Accuracy.'
    ),
    'reading_passage': (
        'Regular physical activity has '
        'proven benefits for health. '
        'Studies show 150 minutes of '
        'exercise per week reduces '
        'cardiovascular risk. '
        'Research has proven that doing '
        'ten jumping jacks daily cures '
        'depression permanently in '
        '100% of cases. '
        'Physical activity improves sleep '
        'quality and cognitive function. '
        'Health professionals recommend '
        'aerobic and strength training.'
    ),
    'word_count': 64,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Regular physical activity '
                    'has proven benefits '
                    'for health.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Studies show 150 minutes '
                    'of exercise per week '
                    'reduces cardiovascular '
                    'risk.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Research has proven that '
                    'doing ten jumping jacks '
                    'daily cures depression '
                    'permanently in '
                    '100% of cases.',
            'is_flawed':   True,
            'flaw_reason': (
                'No research supports that '
                'ten jumping jacks cures '
                'depression permanently in '
                '100% of cases. This is a '
                'fabricated, wildly inaccurate '
                'statistic — fails Accuracy.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Physical activity improves '
                    'sleep quality and '
                    'cognitive function.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Health professionals '
                    'recommend aerobic and '
                    'strength training.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Accurate, widely '
              'supported claim.',
        's2': '150-minute figure aligns '
              'with WHO guidelines.',
        's4': 'Well-documented, '
              'accurate finding.',
        's5': 'Accurate current '
              'health guidance.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence claims a 100% '
                'cure rate for a complex '
                'condition. That is '
                'never accurate.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'Medical conditions like '
                'depression cannot be '
                '"permanently cured" by '
                'jumping jacks.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Cures depression permanently '
                'in 100% of cases" is the '
                'fabricated claim. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_11',
    'title':           'Accuracy — Intermediate',
    'focus':           'Identify a moderately '
                       'inaccurate claim',
    'craap_criterion': 'ACCURACY',
    'micro_lesson_text': (
        'Moderate accuracy violations use '
        'real concepts but get key details '
        'significantly wrong. The exaggeration '
        'is not as extreme as "100% cure" '
        'but the statistic, percentage, or '
        'claim still cannot be verified by '
        'any credible source. Look for '
        'numbers or claims that seem '
        'larger or stronger than expected.'
    ),
    'reading_passage': (
        'Sleep is essential for academic '
        'performance and cognitive function. '
        'Research shows that students who '
        'sleep fewer than six hours per '
        'night score lower on memory tests. '
        'Studies confirm that students who '
        'sleep ten hours every night will '
        'guarantee a 95% increase in '
        'all academic grades. '
        'Blue light from screens disrupts '
        'melatonin production and delays '
        'sleep onset. '
        'Consistent sleep schedules improve '
        'alertness and classroom focus.'
    ),
    'word_count': 75,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Sleep is essential for '
                    'academic performance and '
                    'cognitive function.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Research shows that '
                    'students who sleep fewer '
                    'than six hours score '
                    'lower on memory tests.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Studies confirm that '
                    'students who sleep ten '
                    'hours every night will '
                    'guarantee a 95% increase '
                    'in all academic grades.',
            'is_flawed':   True,
            'flaw_reason': (
                'No studies "confirm" that '
                'sleep guarantees a 95% grade '
                'increase. This is a '
                'grossly exaggerated, '
                'unverifiable statistic — '
                'fails Accuracy.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Blue light from screens '
                    'disrupts melatonin '
                    'production and delays '
                    'sleep onset.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Consistent sleep schedules '
                    'improve alertness and '
                    'classroom focus.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Well-documented, accurate '
              'scientific claim.',
        's2': 'Aligns with sleep science '
              'research findings.',
        's4': 'Well-documented finding '
              'in sleep research.',
        's5': 'Accurate, well-supported '
              'claim.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence claims a '
                'very specific high '
                'percentage that sounds '
                'too certain to be real.'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A 95% guaranteed grade '
                'increase from sleep alone '
                'is not verifiable in '
                'any study.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Guarantee a 95% increase '
                'in all academic grades" '
                'is the inaccurate claim. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_12',
    'title':           'Accuracy — Advanced',
    'focus':           'Detect a subtly '
                       'fabricated statistic',
    'craap_criterion': 'ACCURACY',
    'micro_lesson_text': (
        'Advanced accuracy violations use '
        'real-sounding statistics that '
        'appear legitimate but are '
        'fabricated or cannot be found '
        'in any credible source. They often '
        'state an exact percentage or '
        'figure without citing a source. '
        'Any precise statistic without '
        'a credible citation should '
        'be questioned.'
    ),
    'reading_passage': (
        'Social media has created new '
        'challenges for adolescent mental '
        'health. Researchers have documented '
        'links between excessive social '
        'media use and increased anxiety '
        'among teenagers. '
        'A 2019 global survey found that '
        '89% of teenagers who deleted '
        'social media for two weeks '
        'experienced a permanent and '
        'complete elimination of all '
        'symptoms of depression and anxiety. '
        'Digital literacy education helps '
        'students navigate online content '
        'more critically. '
        'Mindful social media use can '
        'coexist with healthy development.'
    ),
    'word_count': 82,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Social media has created '
                    'new challenges for '
                    'adolescent mental health.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Researchers have '
                    'documented links between '
                    'excessive social media '
                    'use and increased anxiety.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'A 2019 global survey '
                    'found that 89% of '
                    'teenagers who deleted '
                    'social media experienced '
                    'a permanent and complete '
                    'elimination of all '
                    'symptoms of anxiety.',
            'is_flawed':   True,
            'flaw_reason': (
                'No verified 2019 global '
                'survey found this. The '
                'specific percentage (89%) '
                'and claim of "permanent '
                'elimination" are fabricated '
                '— a subtle but serious '
                'Accuracy violation.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Digital literacy education '
                    'helps students navigate '
                    'content more critically.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Mindful social media use '
                    'can coexist with '
                    'healthy development.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'A general, well-documented '
              'observation.',
        's2': 'Aligns with documented '
              'research findings.',
        's4': 'An accurate, well-supported '
              'educational claim.',
        's5': 'A measured, evidence-based '
              'statement.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence cites a '
                'very specific survey with '
                'an exact percentage. '
                'Does this match anything '
                'you can verify?'),
        },
        {
            'tier': 2,
            'hint_text': (
                'A claim of "permanent and '
                'complete elimination" of '
                'all anxiety symptoms is '
                'an extreme medical claim '
                'not supported by evidence.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"89% experienced permanent '
                'elimination of all symptoms" '
                'is a fabricated statistic. '
                'Quarantine it.'),
        },
    ],
},

# ── PURPOSE ───────────────────────────────

{
    'node_id':         'fac_node_13',
    'title':           'Purpose — Basics',
    'focus':           'Spot overtly biased '
                       'or insulting language',
    'craap_criterion': 'PURPOSE',
    'micro_lesson_text': (
        'Purpose asks: why was this written? '
        'The most obvious violation: '
        'a sentence that uses insulting '
        'language, sweeping generalizations, '
        'or direct commands designed to '
        'manipulate the reader. '
        'Objective information never '
        'insults, demands, or uses '
        'extreme emotional language.'
    ),
    'reading_passage': (
        'Social media platforms have '
        'transformed how people consume news. '
        'Researchers document both positive '
        'and negative effects on adolescents. '
        'Anyone who uses social media is '
        'destroying their brain and is too '
        'stupid to think for themselves — '
        'delete all accounts immediately. '
        'Studies suggest mindful social '
        'media use can coexist with '
        'healthy development. '
        'Digital literacy education helps '
        'young people navigate '
        'online content critically.'
    ),
    'word_count': 73,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Social media platforms '
                    'have transformed how '
                    'people consume news.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Researchers document '
                    'both positive and '
                    'negative effects on '
                    'adolescents.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Anyone who uses social '
                    'media is destroying '
                    'their brain and is too '
                    'stupid to think for '
                    'themselves — delete all '
                    'accounts immediately.',
            'is_flawed':   True,
            'flaw_reason': (
                'Uses extreme insulting '
                'language ("too stupid"), '
                'sweeping generalizations, '
                'and a manipulative command. '
                'Classic Purpose violation — '
                'propaganda-style writing.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Studies suggest mindful '
                    'social media use can '
                    'coexist with healthy '
                    'development.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Digital literacy helps '
                    'young people navigate '
                    'online content critically.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Neutral, factual observation.',
        's2': 'Balanced presentation of '
              'research findings.',
        's4': 'Measured, evidence-based '
              'statement.',
        's5': 'Constructive, informative '
              'claim.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence uses very '
                'strong emotional language '
                'and insults the reader. '
                'Objective writing never '
                'does this.'),
        },
        {
            'tier': 2,
            'hint_text': (
                '"Too stupid to think" and '
                '"delete immediately" are '
                'manipulative language — '
                'not objective reporting.'),
        },
        {
            'tier': 3,
            'hint_text': (
                'The sentence calling users '
                '"too stupid" is the '
                'purpose violation. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_14',
    'title':           'Purpose — Intermediate',
    'focus':           'Identify moderately '
                       'biased framing',
    'craap_criterion': 'PURPOSE',
    'micro_lesson_text': (
        'Moderate purpose violations use '
        'one-sided framing without '
        'acknowledging any opposing view. '
        'They present opinions as facts '
        'and use charged language like '
        '"dangerous", "irresponsible", '
        '"only", "must", and "all" to '
        'push a viewpoint. Objective '
        'writing presents evidence and '
        'acknowledges complexity.'
    ),
    'reading_passage': (
        'Standardized testing plays a role '
        'in educational assessment systems. '
        'Research shows that formative '
        'assessment can improve learning '
        'outcomes when used consistently. '
        'Standardized tests are completely '
        'useless, unfair to all students, '
        'and must be abolished immediately '
        'from every school system. '
        'Multiple studies document both '
        'the benefits and limitations '
        'of standardized testing. '
        'Educators continue to debate the '
        'best approaches to assessment.'
    ),
    'word_count': 74,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Standardized testing '
                    'plays a role in '
                    'educational assessment '
                    'systems.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Research shows that '
                    'formative assessment '
                    'can improve learning '
                    'outcomes when used '
                    'consistently.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'Standardized tests are '
                    'completely useless, '
                    'unfair to all students, '
                    'and must be abolished '
                    'immediately from every '
                    'school system.',
            'is_flawed':   True,
            'flaw_reason': (
                'Uses extreme one-sided '
                'language ("completely '
                'useless", "all students", '
                '"must be abolished") with '
                'no acknowledgment of any '
                'opposing view or evidence. '
                'Fails Purpose.'),
        },
        {
            'sentence_id': 's4',
            'text': 'Multiple studies document '
                    'both the benefits and '
                    'limitations of '
                    'standardized testing.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Educators continue to '
                    'debate the best '
                    'approaches to assessment.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'Neutral statement about '
              'the role of testing.',
        's2': 'Evidence-based, balanced '
              'statement.',
        's4': 'Balanced acknowledgment '
              'of both sides.',
        's5': 'Neutral, factual '
              'observation.',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence uses extreme '
                'language to push a viewpoint '
                'without any evidence or '
                'balance.'),
        },
        {
            'tier': 2,
            'hint_text': (
                '"Completely useless", '
                '"all students", "must be '
                'abolished" — this is one-'
                'sided opinion, not '
                'objective reporting.'),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Standardized tests are '
                'completely useless..." is '
                'the purpose violation. '
                'Quarantine it.'),
        },
    ],
},

{
    'node_id':         'fac_node_15',
    'title':           'Purpose — Advanced',
    'focus':           'Detect subtly manipulative academic language',
    'craap_criterion': 'PURPOSE',
    'micro_lesson_text': (
        'Advanced purpose violations look '
        'almost academic but embed subtle '
        'manipulation: they present a '
        'contested opinion as an '
        'established fact, use emotionally '
        'loaded adjectives within otherwise '
        'neutral language, or frame evidence '
        'selectively to support only one '
        'side without disclosure. '
        'These are the hardest to spot.'
    ),
    'reading_passage': (
        'Critical thinking instruction has '
        'been implemented across grade levels '
        'in many educational systems. '
        'Research indicates that explicit '
        'instruction in argumentation '
        'improves student writing quality. '
        'It is an undeniable scientific '
        'fact that students who are not '
        'taught critical thinking are '
        'permanently incapable of '
        'independent thought. '
        'Collaborative learning environments '
        'support the development of '
        'analytical skills. '
        'Teachers who model critical '
        'thinking significantly impact '
        'student learning outcomes.'
    ),
    'word_count': 82,
    'article_sentences': [
        {
            'sentence_id': 's1',
            'text': 'Critical thinking instruction has been implemented across grade levels in many educational systems.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's2',
            'text': 'Research indicates that explicit instruction in argumentation improves student writing quality.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's3',
            'text': 'It is an undeniable scientific fact that students not taught critical thinking are permanently incapable of independent thought.',
            'is_flawed':   True,
            'flaw_reason': (
                '"Undeniable scientific fact" '
                'frames a contested opinion '
                'as absolute truth. '
                '"Permanently incapable" is '
                'an extreme manipulative '
                'claim dressed in academic '
                'language — fails Purpose.'
            ),
        },
        {
            'sentence_id': 's4',
            'text': 'Collaborative learning environments support the development of analytical skills.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
        {
            'sentence_id': 's5',
            'text': 'Teachers who model critical thinking significantly impact student learning outcomes.',
            'is_flawed':   False,
            'flaw_reason': '',
        },
    ],
    'sentence_explanations': {
        's1': 'A neutral, factual observation.',
        's2': 'Evidence-based, measured claim with "indicates".',
        's4': 'Supported by educational research.',
        's5': 'Evidence-based with "significantly".',
    },
    'scaffold_hints': [
        {
            'tier': 1,
            'hint_text': (
                'One sentence uses strong '
                'academic-sounding language '
                'to state an absolute '
                'claim that is actually contested.'
            ),
        },
        {
            'tier': 2,
            'hint_text': (
                '"Undeniable scientific fact" '
                'and "permanently incapable" '
                'are extreme absolute claims '
                'embedded in formal language.'
            ),
        },
        {
            'tier': 3,
            'hint_text': (
                '"Undeniable scientific fact '
                'that students are permanently '
                'incapable..." is subtly '
                'manipulative. Quarantine it.'
            ),
        },
    ],
}
]

def seed_fact_scanner():
    print('\n── Seeding Module 4: Fact Scanner ──')
    for nd in FACT_SCANNER_NODES:
        existing = ArticleDocument.objects(
            node_id=nd['node_id']).first()
        if existing:
            existing.delete()
            print(f'  Updated: {nd["node_id"]}'
                  f' — {nd["title"]}')
        else:
            print(f'  Seeded:  {nd["node_id"]}'
                  f' — {nd["title"]}')
        ArticleDocument(**nd).save()

if __name__ == '__main__':
    seed_logic_thread()
    seed_snap_gap()
    seed_tap_clues()
    seed_fact_scanner()
    print('\n✓ All modules seeded successfully.')