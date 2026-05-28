# backend/api/seed/seed_nodes.py
import os, sys, django

sys.path.insert(0, os.path.join(
    os.path.dirname(__file__), '..', '..'))
os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.modules.logic_thread.mongo_models import (
    LogicThreadNodeDocument)

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