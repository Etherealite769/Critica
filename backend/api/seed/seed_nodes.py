# backend/api/seed/seed_nodes.py
import os, sys, django

sys.path.insert(0, os.path.join(
    os.path.dirname(__file__), '..', '..'))
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.modules.logic_thread.mongo_models import (
    LogicThreadNodeDocument)

from api.modules.snap_gap.mongo_models import (
    CoherenceNodeDocument)

NODES = [
    {
        'node_id': 'log_node_01',
        'title':   'Narration Patterns',
        'focus':   'Mapping the narration pattern '
                   'of text development',
        'micro_lesson_text': (
            'A narration pattern tells a story or '
            'describes events in chronological order. '
            'Look for time signal words like first, '
            'then, next, after, and finally.'
        ),
        'reading_passage': (
            'Maria woke up early on the day of her '
            'exam. First, she reviewed her notes for '
            'an hour. Then she ate a light breakfast '
            'to keep her energy up. After arriving '
            'at school, she found a quiet seat and '
            'took a deep breath. Finally, when the '
            'papers were distributed, she felt ready.'
        ),
        'word_count': 58,
        'paragraph_blocks': [
            {'block_id': 'b1',
             'text': 'Maria woke up early on the '
                     'day of her exam.',
             'order': 1},
            {'block_id': 'b2',
             'text': 'First, she reviewed her notes '
                     'for an hour.',
             'order': 2},
            {'block_id': 'b3',
             'text': 'Then she ate a light breakfast '
                     'to keep her energy up.',
             'order': 3},
            {'block_id': 'b4',
             'text': 'Finally, when the papers were '
                     'distributed, she felt ready.',
             'order': 4},
        ],
        'correct_sequence': ['b1','b2','b3','b4'],
        'structural_explanations': {
            'b3__b1': (
                'Block 1 is the opening event. '
                'It must come first.'),
            'b4__b2': (
                '"Finally" signals the last event, '
                'not the second step.'),
            'b2__b4': (
                '"First" signals the first action. '
                'It cannot follow the final outcome.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'Look for the sentence '
                          'that sets the scene first.'},
            {'tier': 2,
             'hint_text': 'Time words like "First", '
                          '"Then", and "Finally" show '
                          'the correct order.'},
            {'tier': 3,
             'hint_text': 'Correct order: opening → '
                          'first action → second '
                          'action → final outcome.'},
        ],
    },
    {
        'node_id': 'log_node_02',
        'title':   'Definition Patterns',
        'focus':   'Mapping the definition pattern '
                   'of text development',
        'micro_lesson_text': (
            'A definition pattern introduces a '
            'concept and explains what it means. '
            'Look for signal phrases like "is '
            'defined as", "refers to", "means", '
            'or "is a type of".'
        ),
        'reading_passage': (
            'Critical reading is defined as the '
            'active process of analyzing and '
            'evaluating a text. It goes beyond '
            'simply understanding words on a page. '
            'A critical reader questions the '
            'author\'s purpose, identifies bias, '
            'and evaluates evidence. In short, '
            'critical reading transforms passive '
            'readers into active thinkers.'
        ),
        'word_count': 62,
        'paragraph_blocks': [
            {'block_id': 'b1',
             'text': 'Critical reading is defined '
                     'as the active process of '
                     'analyzing and evaluating '
                     'a text.',
             'order': 1},
            {'block_id': 'b2',
             'text': 'It goes beyond simply '
                     'understanding words on '
                     'a page.',
             'order': 2},
            {'block_id': 'b3',
             'text': 'A critical reader questions '
                     'the author\'s purpose, '
                     'identifies bias, and '
                     'evaluates evidence.',
             'order': 3},
            {'block_id': 'b4',
             'text': 'In short, critical reading '
                     'transforms passive readers '
                     'into active thinkers.',
             'order': 4},
        ],
        'correct_sequence': ['b1','b2','b3','b4'],
        'structural_explanations': {
            'b4__b1': (
                '"In short" is a conclusion signal. '
                'It cannot open the definition.'),
            'b3__b2': (
                'Block 2 expands the definition. '
                'Block 3 gives examples of the '
                'definition in practice.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'Find the sentence that '
                          'directly states what the '
                          'concept is.'},
            {'tier': 2,
             'hint_text': '"Is defined as" signals '
                          'the opening block.'},
            {'tier': 3,
             'hint_text': 'Order: definition → '
                          'expansion → examples → '
                          'summary.'},
        ],
    },
    {
        'node_id': 'log_node_03',
        'title':   'Comparison and Contrast Patterns',
        'focus':   'Mapping both the comparison '
                   'and contrast patterns of text '
                   'development',
        'micro_lesson_text': (
            'Comparison shows how two things are '
            'similar. Contrast shows how they '
            'differ. Signal words for comparison: '
            'similarly, likewise, both, in the '
            'same way. Signal words for contrast: '
            'however, on the other hand, whereas, '
            'unlike.'
        ),
        'reading_passage': (
            'Both traditional classrooms and online '
            'learning aim to deliver quality '
            'education. Similarly, both formats '
            'require dedication from learners. '
            'However, traditional classrooms offer '
            'face-to-face interaction that online '
            'platforms cannot fully replicate. '
            'On the other hand, online learning '
            'provides flexibility that fixed '
            'schedules do not allow.'
        ),
        'word_count': 66,
        'paragraph_blocks': [
            {'block_id': 'b1',
             'text': 'Both traditional classrooms '
                     'and online learning aim to '
                     'deliver quality education.',
             'order': 1},
            {'block_id': 'b2',
             'text': 'Similarly, both formats '
                     'require dedication and '
                     'consistent effort.',
             'order': 2},
            {'block_id': 'b3',
             'text': 'However, traditional '
                     'classrooms offer face-to-face '
                     'interaction that online '
                     'platforms cannot replicate.',
             'order': 3},
            {'block_id': 'b4',
             'text': 'On the other hand, online '
                     'learning provides flexibility '
                     'that fixed schedules do not '
                     'allow.',
             'order': 4},
        ],
        'correct_sequence': ['b1','b2','b3','b4'],
        'structural_explanations': {
            'b3__b1': (
                '"However" signals contrast. It '
                'must follow a comparison point, '
                'not open the passage.'),
            'b2__b4': (
                '"Similarly" signals comparison. '
                'It must come before the '
                'contrast blocks.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'Find the block that '
                          'introduces both subjects.'},
            {'tier': 2,
             'hint_text': 'Comparison blocks come '
                          'before contrast blocks.'},
            {'tier': 3,
             'hint_text': 'Order: introduction → '
                          'similarity → first '
                          'contrast → second '
                          'contrast.'},
        ],
    },
    {
        'node_id': 'log_node_04',
        'title':   'Cause and Effect Patterns',
        'focus':   'Mapping the cause-effect '
                   'pattern of text development',
        'micro_lesson_text': (
            'A cause-and-effect pattern shows how '
            'one event leads to another. The cause '
            'is the reason something happens. The '
            'effect is the result. Signal words: '
            'because, therefore, as a result, '
            'leads to, consequently.'
        ),
        'reading_passage': (
            'Deforestation removes trees that hold '
            'soil in place. Without tree roots, '
            'heavy rain washes the topsoil away. '
            'This leads to landslides and flooding '
            'in nearby communities. As a result, '
            'local farmers lose fertile land and '
            'rivers become clogged with sediment.'
        ),
        'word_count': 52,
        'paragraph_blocks': [
            {'block_id': 'b1',
             'text': 'Deforestation removes trees '
                     'that hold soil in place.',
             'order': 1},
            {'block_id': 'b2',
             'text': 'Without tree roots, heavy '
                     'rain washes the topsoil away.',
             'order': 2},
            {'block_id': 'b3',
             'text': 'This leads to landslides and '
                     'flooding in nearby communities.',
             'order': 3},
            {'block_id': 'b4',
             'text': 'As a result, local farmers '
                     'lose fertile land and rivers '
                     'become clogged with sediment.',
             'order': 4},
        ],
        'correct_sequence': ['b1','b2','b3','b4'],
        'structural_explanations': {
            'b3__b1': (
                'Block 1 is the root cause. '
                'It cannot follow an effect.'),
            'b4__b2': (
                '"As a result" signals a final '
                'consequence, not the second '
                'event.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'Look for the sentence '
                          'that describes the '
                          'initial action or cause.'},
            {'tier': 2,
             'hint_text': '"Without" signals the '
                          'immediate consequence '
                          'of the cause.'},
            {'tier': 3,
             'hint_text': 'Order: root cause → '
                          'immediate effect → '
                          'secondary effect → '
                          'final consequence.'},
        ],
    },
]

for node in NODES:
    if not LogicThreadNodeDocument.objects(
            node_id=node['node_id']).first():
        LogicThreadNodeDocument(**node).save()
        print(f"Seeded: {node['node_id']} "
              f"— {node['title']}")
    else:
        print(f"Already exists: {node['node_id']}")

print('\nDone.')

# ── Module 2 seed data ──────────────────────────
SNAP_GAP_NODES = [
    {
        'node_id': 'snp_node_01',
        'title':   'Addition and Sequence '
                   'Transitions',
        'focus':   'Transitions like furthermore, '
                   'next, additionally',
        'micro_lesson_text': (
            'Addition transitions connect ideas '
            'by adding more information. Sequence '
            'transitions show order. Key words: '
            'furthermore, additionally, next, '
            'also, in addition, first, then.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Regular exercise '
                              'improves '
                              'cardiovascular health.',
                'sentence_b': 'it strengthens '
                              'muscles and boosts '
                              'mental well-being.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'To write a strong '
                              'essay, start with '
                              'a clear thesis.',
                'sentence_b': 'support your '
                              'argument with '
                              'specific evidence.',
            },
        ],
        'transition_tile_dock': [
            'Furthermore', 'However',
            'Therefore', 'Next',
            'Nevertheless', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'Furthermore',
            'pair_02': 'Next',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. These '
                'sentences add to the same idea, '
                'not oppose it.'),
            'pair_01__Therefore': (
                '"Therefore" signals a conclusion. '
                'The second sentence adds a benefit, '
                'not a result.'),
            'pair_02__Furthermore': (
                '"Furthermore" works but "Next" is '
                'more precise for step-by-step '
                'instructions.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'These sentences build '
                          'on the same topic. Look '
                          'for a word that adds.'},
            {'tier': 2,
             'hint_text': 'Addition words: '
                          'furthermore, additionally, '
                          'in addition. Sequence '
                          'words: next, then, first.'},
            {'tier': 3,
             'hint_text': 'Pair 01 needs an addition '
                          'word. Pair 02 is a '
                          'sequence — use "Next".'},
        ],
    },
    {
        'node_id': 'snp_node_02',
        'title':   'Contrast and Opposition '
                   'Transitions',
        'focus':   'Transitions like however, '
                   'on the other hand',
        'micro_lesson_text': (
            'Contrast transitions signal that the '
            'second idea opposes or differs from '
            'the first. Key words: however, '
            'on the other hand, nevertheless, '
            'whereas, although, yet.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Many students '
                              'believe they are '
                              'strong readers.',
                'sentence_b': 'their test scores '
                              'consistently show '
                              'low comprehension.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Digital libraries '
                              'offer instant access '
                              'to millions of books.',
                'sentence_b': 'many readers still '
                              'prefer physical '
                              'books.',
            },
        ],
        'transition_tile_dock': [
            'However', 'Therefore',
            'Furthermore', 'Nevertheless',
            'As a result', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'However',
            'pair_02': 'Nevertheless',
        },
        'tile_error_explanations': {
            'pair_01__Therefore': (
                '"Therefore" implies the second '
                'sentence is a result. These '
                'sentences show an opposing idea.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds information. '
                'These sentences contrast digital '
                'and physical reading.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'The second sentence '
                          'contradicts the first. '
                          'Look for a contrast word.'},
            {'tier': 2,
             'hint_text': 'Contrast words: however, '
                          'nevertheless, on the '
                          'other hand, yet.'},
            {'tier': 3,
             'hint_text': 'Use "however" for pair '
                          '01 and "nevertheless" '
                          'for pair 02.'},
        ],
    },
    {
        'node_id': 'snp_node_03',
        'title':   'Cause and Effect Transitions',
        'focus':   'Transitions like therefore, '
                   'consequently',
        'micro_lesson_text': (
            'Cause and effect transitions show '
            'that one event causes another. '
            'Key words: therefore, consequently, '
            'as a result, thus, because of this, '
            'for this reason.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'The student did '
                              'not review her '
                              'notes before the exam.',
                'sentence_b': 'she struggled to '
                              'answer several '
                              'key questions.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'The river flooded '
                              'the nearby farmlands.',
                'sentence_b': 'many families were '
                              'forced to evacuate '
                              'their homes.',
            },
        ],
        'transition_tile_dock': [
            'Therefore', 'However',
            'Furthermore', 'Consequently',
            'Nevertheless', 'In addition',
        ],
        'correct_tile_map': {
            'pair_01': 'Therefore',
            'pair_02': 'Consequently',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. The '
                'second sentence is a result of '
                'not reviewing, not an opposing '
                'idea.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds information. '
                'The evacuation is a direct '
                'result of the flood.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'The second sentence '
                          'happened because of '
                          'the first.'},
            {'tier': 2,
             'hint_text': 'Cause-effect words: '
                          'therefore, consequently, '
                          'as a result.'},
            {'tier': 3,
             'hint_text': 'Use "therefore" for '
                          'pair 01 and '
                          '"consequently" for '
                          'pair 02.'},
        ],
    },
    {
        'node_id': 'snp_node_04',
        'title':   'Conclusion Signal Transitions',
        'focus':   'Transitions like ultimately, '
                   'in conclusion',
        'micro_lesson_text': (
            'Conclusion transitions signal that '
            'the writer is summarizing or closing '
            'an argument. Key words: in conclusion, '
            'ultimately, to summarize, in summary, '
            'overall, to conclude.'
        ),
        'reading_passage': '',
        'word_count': 0,
        'sentence_pairs': [
            {
                'pair_id':    'pair_01',
                'sentence_a': 'Critical reading '
                              'builds analytical '
                              'thinking, vocabulary, '
                              'and evaluation skills.',
                'sentence_b': 'it is one of the '
                              'most valuable academic '
                              'skills a student '
                              'can develop.',
            },
            {
                'pair_id':    'pair_02',
                'sentence_a': 'Evidence shows that '
                              'gamified learning '
                              'increases engagement '
                              'and retention.',
                'sentence_b': 'incorporating game '
                              'mechanics into '
                              'education is worth '
                              'pursuing.',
            },
        ],
        'transition_tile_dock': [
            'In conclusion', 'However',
            'Furthermore', 'Ultimately',
            'Nevertheless', 'Therefore',
        ],
        'correct_tile_map': {
            'pair_01': 'Ultimately',
            'pair_02': 'In conclusion',
        },
        'tile_error_explanations': {
            'pair_01__However': (
                '"However" signals contrast. '
                'The second sentence summarizes '
                'and concludes the argument.'),
            'pair_02__Furthermore': (
                '"Furthermore" adds more '
                'information. The second sentence '
                'is drawing a final conclusion.'),
        },
        'scaffold_hints': [
            {'tier': 1,
             'hint_text': 'The second sentence '
                          'wraps up the argument. '
                          'Look for a closing word.'},
            {'tier': 2,
             'hint_text': 'Conclusion words: '
                          'ultimately, in conclusion, '
                          'in summary, overall.'},
            {'tier': 3,
             'hint_text': 'Use "ultimately" for '
                          'pair 01 and '
                          '"in conclusion" for '
                          'pair 02.'},
        ],
    },
]

for node_data in SNAP_GAP_NODES:
    if not CoherenceNodeDocument.objects(
            node_id=node_data['node_id']).first():
        CoherenceNodeDocument(
            **node_data
        ).save()
        print(f"Seeded {node_data['node_id']}: "
              f"{node_data['title']}")
    else:
        print(f"Already exists: "
              f"{node_data['node_id']}")