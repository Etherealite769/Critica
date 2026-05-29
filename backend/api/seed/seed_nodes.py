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

from api.modules.tap_clues.mongo_models import (
    VocabularyNodeDocument)

from api.modules.fact_scanner.mongo_models import (
    ArticleDocument)

LOGIC_NODES = [
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

for node in LOGIC_NODES:
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
        

TAP_CLUES_NODES = [
    {
        'node_id': 'tap_node_01',
        'title':   'Synonym Clues',
        'focus':   'Finding words nearby with '
                   'similar meanings',
        'micro_lesson_text': (
            'A synonym clue gives a word or phrase '
            'near the unknown word that means almost '
            'the same thing. Look for commas, dashes, '
            'or phrases like "or", "also known as", '
            '"in other words" that introduce synonyms.'
        ),
        'reading_passage': (
            'The scientist\'s findings were met with '
            'skepticism — doubt and disbelief — by her '
            'peers, who demanded more rigorous evidence '
            'before accepting her conclusions. Despite '
            'the scrutiny, or close examination, she '
            'remained steadfast in her position.'
        ),
        'word_count': 48,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'skepticism',
                'position_index':   7,
                'correct_clue_ids': [
                    'doubt', 'disbelief'],
                'definition': (
                    'Doubt or disbelief about the '
                    'truth of something.'),
                'contextual_usage': (
                    'The proposal was received with '
                    'skepticism by the committee.'),
                'translation': 'pag-aalinlangan',
            },
        ],
        'clue_error_explanations': {
            'w1__scientist': (
                '"scientist" identifies who is '
                'speaking, not the meaning of '
                'skepticism.'),
            'w1__evidence': (
                '"evidence" is what the peers '
                'demanded — it is not a synonym '
                'for skepticism.'),
            'w1__conclusions': (
                '"conclusions" refers to what is '
                'being doubted, not the act of '
                'doubting itself.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Look for words inside dashes '
                    'or after "or" near the locked '
                    'word.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'The dash after "skepticism" '
                    'introduces its synonym '
                    'directly.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "doubt" and "disbelief" '
                    '— they appear right after '
                    'the dash as synonyms.'),
            },
        ],
    },
    {
        'node_id': 'tap_node_02',
        'title':   'Definition Clues',
        'focus':   'Spotting exact definitions '
                   'embedded in the text',
        'micro_lesson_text': (
            'A definition clue directly states what '
            'a word means, usually right after it. '
            'Signal phrases: "which means", '
            '"defined as", "that is", "refers to", '
            'or using commas and parentheses to '
            'embed the definition.'
        ),
        'reading_passage': (
            'The CRAAP Test, which is defined as a '
            'method for evaluating sources based on '
            'Currency, Relevance, Authority, '
            'Accuracy, and Purpose, helps readers '
            'assess credibility. Bias, or the '
            'tendency to favor one side unfairly, '
            'is one of the key indicators of poor '
            'authority in a source.'
        ),
        'word_count': 58,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'bias',
                'position_index':   28,
                'correct_clue_ids': [
                    'tendency', 'favor'],
                'definition': (
                    'An inclination to favor one '
                    'side or perspective unfairly.'),
                'contextual_usage': (
                    'The article showed clear bias '
                    'toward one political party.'),
                'translation': 'pagkiling',
            },
        ],
        'clue_error_explanations': {
            'w1__credibility': (
                '"credibility" is what readers '
                'assess — it is not a definition '
                'of bias.'),
            'w1__CRAAP': (
                '"CRAAP" is the name of the test, '
                'not a clue for defining bias.'),
            'w1__authority': (
                '"authority" is a CRAAP criterion, '
                'not a definition of bias.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'Look for a phrase after the '
                    'locked word that explains '
                    'what it means.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'After "Bias", look for "or '
                    'the tendency to..." as a '
                    'definition signal.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "tendency" and "favor" '
                    '— they are part of the '
                    'embedded definition after '
                    'the comma.'),
            },
        ],
    },
    {
        'node_id': 'tap_node_03',
        'title':   'Antonym and Contrast Clues',
        'focus':   'Identifying opposite words that '
                   'hint at the target word\'s meaning',
        'micro_lesson_text': (
            'An antonym clue gives a word or phrase '
            'that means the opposite of the unknown '
            'word. Signal words: but, however, unlike, '
            'on the other hand, rather than, while, '
            'in contrast. Use the opposite to figure '
            'out what the target word means.'
        ),
        'reading_passage': (
            'Unlike her verbose classmates who '
            'rambled on for several minutes, Ana\'s '
            'presentation was concise — she covered '
            'every key point in under two minutes '
            'without wasting a single word. The '
            'audience appreciated her brevity rather '
            'than the long-winded style of others.'
        ),
        'word_count': 54,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'verbose',
                'position_index':   3,
                'correct_clue_ids': [
                    'concise', 'brevity'],
                'definition': (
                    'Using more words than necessary; '
                    'wordy.'),
                'contextual_usage': (
                    'His verbose explanation confused '
                    'the audience instead of '
                    'clarifying the point.'),
                'translation': 'malapastol',
            },
        ],
        'clue_error_explanations': {
            'w1__presentation': (
                '"presentation" is what Ana did, '
                'not a contrast clue for verbose.'),
            'w1__audience': (
                '"audience" describes who listened, '
                'not a hint about the meaning '
                'of verbose.'),
            'w1__rambled': (
                '"rambled" describes the same '
                'behavior as verbose — it is not '
                'an antonym clue.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'The passage contrasts two '
                    'speakers. Verbose is one style '
                    '— what is the opposite?'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Ana\'s style is described as '
                    'the opposite of verbose. '
                    'What words describe her style?'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "concise" and "brevity" '
                    '— both are opposites of verbose '
                    'used to describe Ana.'),
            },
        ],
    },
    {
        'node_id': 'tap_node_04',
        'title':   'Example and Inference Clues',
        'focus':   'Deducing meaning from scenarios '
                   'or settings described nearby',
        'micro_lesson_text': (
            'An inference clue does not directly '
            'define the unknown word. Instead, '
            'it gives examples or describes a '
            'scenario that lets you figure out '
            'the meaning. Signal phrases: for '
            'example, such as, including, like. '
            'Use the examples to infer the '
            'general meaning.'
        ),
        'reading_passage': (
            'The students were in a state of '
            'consternation after hearing the '
            'announcement — some paced the '
            'hallways nervously, others sat '
            'frozen at their desks, and several '
            'began whispering anxiously to their '
            'classmates about what would happen '
            'next. No one could focus on '
            'their work.'
        ),
        'word_count': 56,
        'locked_words': [
            {
                'word_id':          'w1',
                'word':             'consternation',
                'position_index':   7,
                'correct_clue_ids': [
                    'nervously', 'anxiously'],
                'definition': (
                    'A feeling of anxiety or '
                    'dismay, typically at something '
                    'unexpected.'),
                'contextual_usage': (
                    'The sudden power outage caused '
                    'consternation among the '
                    'hospital staff.'),
                'translation': 'pagkabagabag',
            },
        ],
        'clue_error_explanations': {
            'w1__paced': (
                '"paced" describes an action, '
                'not a feeling. Look for words '
                'that describe the emotional '
                'state.'),
            'w1__whispering': (
                '"whispering" is an action. '
                'You need words that indicate '
                'the emotional tone.'),
            'w1__frozen': (
                '"frozen" describes a physical '
                'reaction, not the emotional '
                'feeling itself. Look for '
                'feeling words.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'The examples show how students '
                    'are feeling. What emotion do '
                    'the actions suggest?'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Look for feeling words near '
                    'the examples — words that '
                    'describe worry or anxiety.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'Tap "nervously" and "anxiously" '
                    '— they describe the emotional '
                    'state that defines '
                    'consternation.'),
            },
        ],
    },
]

for node_data in TAP_CLUES_NODES:
    if not VocabularyNodeDocument.objects(
            node_id=node_data['node_id']).first():
        VocabularyNodeDocument(
            **node_data
        ).save()
        print(f"Seeded {node_data['node_id']}: "
              f"{node_data['title']}")
    else:
        print(f"Already exists: "
              f"{node_data['node_id']}")
        
FACT_SCANNER_NODES = [
    {
        'node_id':         'fac_node_01',
        'title':           'Currency',
        'focus':           'Identifying outdated '
                           'information',
        'craap_criterion': 'CURRENCY',
        'micro_lesson_text': (
            'Currency asks: Is this information '
            'up to date? Check the publication '
            'date, whether links still work, and '
            'whether the field has changed since '
            'publication. Outdated statistics, '
            'superseded laws, or obsolete '
            'technology references are red flags.'
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
            'accelerated dramatically in recent '
            'decades. '
            'Governments worldwide are now '
            'implementing carbon reduction '
            'policies to address this crisis.'
        ),
        'word_count': 72,
        'article_sentences': [
            {
                'sentence_id': 's1',
                'text': (
                    'Climate change is an urgent '
                    'global issue requiring '
                    'immediate action.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's2',
                'text': (
                    'Scientists warn that average '
                    'global temperatures have risen '
                    'significantly over the past '
                    'century.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's3',
                'text': (
                    'According to a 1975 study, '
                    'the Earth will experience '
                    'minimal warming over the next '
                    'fifty years.'),
                'is_flawed':   True,
                'flaw_reason': (
                    'This sentence cites a 1975 '
                    'study — over 50 years old. '
                    'Climate science has advanced '
                    'drastically since then. This '
                    'is an outdated source that '
                    'fails the Currency criterion.'),
            },
            {
                'sentence_id': 's4',
                'text': (
                    'Renewable energy adoption has '
                    'accelerated dramatically in '
                    'recent decades.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's5',
                'text': (
                    'Governments worldwide are now '
                    'implementing carbon reduction '
                    'policies to address this '
                    'crisis.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
        ],
        'sentence_explanations': {
            's1': (
                'This sentence is a general '
                'statement about climate change '
                'urgency — it is current and '
                'accurate. Look for sentences '
                'citing specific old dates or '
                'outdated data.'),
            's2': (
                'This sentence reflects current '
                'scientific consensus. It does '
                'not cite an outdated source.'),
            's4': (
                'This is a current, accurate '
                'observation about energy trends. '
                'Not a currency violation.'),
            's5': (
                'This reflects current policy '
                'reality. No currency issue here.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One sentence mentions a '
                    'specific year that is very '
                    'old. Currency means checking '
                    'how recent the source is.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Look for a sentence that '
                    'cites a study from the 1970s. '
                    'Climate science from 50 years '
                    'ago is no longer reliable.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'The sentence starting with '
                    '"According to a 1975 study" '
                    'is the flawed one. A 1975 '
                    'climate prediction fails '
                    'Currency completely.'),
            },
        ],
    },
    {
        'node_id':         'fac_node_02',
        'title':           'Relevance',
        'focus':           'Spotting off-topic or '
                           'mismatched information',
        'craap_criterion': 'RELEVANCE',
        'micro_lesson_text': (
            'Relevance asks: Does this information '
            'relate to your topic? Does it match '
            'your audience level? Look for '
            'sentences that discuss unrelated '
            'topics, target the wrong audience, '
            'or fail to address the actual '
            'question being discussed.'
        ),
        'reading_passage': (
            'Critical reading is an essential '
            'skill for academic success. '
            'Students who read critically are '
            'better equipped to evaluate sources '
            'and construct strong arguments. '
            'The history of football in the '
            'Philippines dates back to the '
            'American colonial period. '
            'Developing critical reading skills '
            'requires consistent practice and '
            'deliberate engagement with complex '
            'texts. '
            'Teachers play a key role in '
            'modeling analytical reading '
            'strategies for their students.'
        ),
        'word_count': 78,
        'article_sentences': [
            {
                'sentence_id': 's1',
                'text': (
                    'Critical reading is an '
                    'essential skill for academic '
                    'success.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's2',
                'text': (
                    'Students who read critically '
                    'are better equipped to '
                    'evaluate sources and construct '
                    'strong arguments.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's3',
                'text': (
                    'The history of football in '
                    'the Philippines dates back '
                    'to the American colonial '
                    'period.'),
                'is_flawed':   True,
                'flaw_reason': (
                    'This sentence is completely '
                    'off-topic. The article is '
                    'about critical reading — '
                    'football history in the '
                    'Philippines has no relevance '
                    'to this topic whatsoever.'),
            },
            {
                'sentence_id': 's4',
                'text': (
                    'Developing critical reading '
                    'skills requires consistent '
                    'practice and deliberate '
                    'engagement with complex '
                    'texts.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's5',
                'text': (
                    'Teachers play a key role in '
                    'modeling analytical reading '
                    'strategies for their '
                    'students.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
        ],
        'sentence_explanations': {
            's1': (
                'This sentence is directly '
                'relevant — it introduces the '
                'topic of critical reading.'),
            's2': (
                'This sentence supports the '
                'topic by explaining the benefits '
                'of critical reading.'),
            's4': (
                'This sentence is on-topic, '
                'discussing how to develop '
                'critical reading.'),
            's5': (
                'This sentence is relevant — '
                'it discusses the teacher\'s '
                'role in reading instruction.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One sentence is about a '
                    'completely different subject. '
                    'Ask yourself: does every '
                    'sentence relate to critical '
                    'reading?'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Most sentences are about '
                    'reading skills. One sentence '
                    'is about a sport — that is '
                    'clearly off-topic.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'The sentence about football '
                    'in the Philippines has '
                    'nothing to do with critical '
                    'reading. Quarantine it.'),
            },
        ],
    },
    {
        'node_id':         'fac_node_03',
        'title':           'Authority',
        'focus':           'Highlighting unsupported '
                           'claims or missing '
                           'credentials',
        'craap_criterion': 'AUTHORITY',
        'micro_lesson_text': (
            'Authority asks: Who created this '
            'information? What are their '
            'credentials? Look for anonymous '
            'claims, unverified sources, missing '
            'author qualifications, or statements '
            'that cite vague unnamed experts '
            'without any verifiable attribution.'
        ),
        'reading_passage': (
            'Vaccination programs have been '
            'instrumental in eradicating diseases '
            'such as smallpox globally. '
            'The World Health Organization '
            'recommends routine immunization '
            'for children worldwide. '
            'Experts say that vaccines cause '
            'more harm than good and should '
            'be avoided by healthy individuals. '
            'Published clinical trials in peer-'
            'reviewed journals confirm that '
            'approved vaccines undergo rigorous '
            'safety testing. '
            'Public health authorities continue '
            'to advocate for high vaccination '
            'coverage to achieve herd immunity.'
        ),
        'word_count': 82,
        'article_sentences': [
            {
                'sentence_id': 's1',
                'text': (
                    'Vaccination programs have '
                    'been instrumental in '
                    'eradicating diseases such '
                    'as smallpox globally.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's2',
                'text': (
                    'The World Health Organization '
                    'recommends routine immunization '
                    'for children worldwide.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's3',
                'text': (
                    'Experts say that vaccines '
                    'cause more harm than good '
                    'and should be avoided by '
                    'healthy individuals.'),
                'is_flawed':   True,
                'flaw_reason': (
                    'This sentence says "Experts '
                    'say" without naming any '
                    'expert, institution, or '
                    'study. This is a vague, '
                    'unverified authority claim '
                    '— a classic Authority '
                    'CRAAP failure.'),
            },
            {
                'sentence_id': 's4',
                'text': (
                    'Published clinical trials in '
                    'peer-reviewed journals confirm '
                    'that approved vaccines undergo '
                    'rigorous safety testing.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's5',
                'text': (
                    'Public health authorities '
                    'continue to advocate for '
                    'high vaccination coverage '
                    'to achieve herd immunity.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
        ],
        'sentence_explanations': {
            's1': (
                'This is a factual historical '
                'statement with verifiable '
                'evidence. Not an authority '
                'violation.'),
            's2': (
                'The WHO is a named, credible '
                'international authority. This '
                'passes the Authority criterion.'),
            's4': (
                'Peer-reviewed journals are a '
                'credible authority source. '
                'This sentence passes.'),
            's5': (
                '"Public health authorities" is '
                'slightly vague but refers to a '
                'recognized category of experts. '
                'Not the worst violation here.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One sentence makes a strong '
                    'claim but does not name '
                    'who said it. Authority '
                    'requires knowing the source.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Look for a sentence that '
                    'starts with "Experts say" '
                    'without identifying which '
                    'experts or any source.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"Experts say that vaccines '
                    'cause more harm..." has no '
                    'named expert or study. '
                    'Quarantine it as an '
                    'Authority violation.'),
            },
        ],
    },
    {
        'node_id':         'fac_node_04',
        'title':           'Accuracy',
        'focus':           'Identifying factual '
                           'errors or unverified data',
        'craap_criterion': 'ACCURACY',
        'micro_lesson_text': (
            'Accuracy asks: Is the information '
            'correct and verifiable? Can you find '
            'the same claim in other reliable '
            'sources? Look for statistics that '
            'seem exaggerated, factual claims '
            'that contradict known evidence, '
            'or data that cannot be verified '
            'through reputable sources.'
        ),
        'reading_passage': (
            'Regular physical activity has '
            'numerous proven benefits for '
            'mental and physical health. '
            'Studies show that exercising '
            'for at least 150 minutes per '
            'week reduces the risk of '
            'cardiovascular disease. '
            'Research has proven that doing '
            'ten jumping jacks daily cures '
            'depression permanently in '
            '100% of cases. '
            'Physical activity also improves '
            'sleep quality and cognitive '
            'function in both children and '
            'adults. '
            'Health professionals recommend '
            'combining aerobic and strength '
            'training for optimal results.'
        ),
        'word_count': 84,
        'article_sentences': [
            {
                'sentence_id': 's1',
                'text': (
                    'Regular physical activity '
                    'has numerous proven benefits '
                    'for mental and physical '
                    'health.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's2',
                'text': (
                    'Studies show that exercising '
                    'for at least 150 minutes per '
                    'week reduces the risk of '
                    'cardiovascular disease.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's3',
                'text': (
                    'Research has proven that '
                    'doing ten jumping jacks daily '
                    'cures depression permanently '
                    'in 100% of cases.'),
                'is_flawed':   True,
                'flaw_reason': (
                    'This sentence contains a '
                    'wildly inaccurate claim. '
                    'No research supports that '
                    'ten jumping jacks "cures '
                    'depression permanently in '
                    '100% of cases." This is '
                    'an Accuracy failure — '
                    'a fabricated statistic.'),
            },
            {
                'sentence_id': 's4',
                'text': (
                    'Physical activity also '
                    'improves sleep quality and '
                    'cognitive function in both '
                    'children and adults.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's5',
                'text': (
                    'Health professionals '
                    'recommend combining aerobic '
                    'and strength training for '
                    'optimal results.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
        ],
        'sentence_explanations': {
            's1': (
                'This is an accurate, widely '
                'supported general claim. '
                'Not an accuracy violation.'),
            's2': (
                'The 150-minute figure aligns '
                'with WHO guidelines. '
                'This is accurate.'),
            's4': (
                'This is a well-documented and '
                'accurate finding in exercise '
                'science. Not a violation.'),
            's5': (
                'This reflects accurate current '
                'health guidance. No issue here.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One sentence makes a medical '
                    'claim that sounds too extreme '
                    'to be true. Accuracy means '
                    'claims must be verifiable.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Look for a sentence that '
                    'claims a 100% cure rate for '
                    'a complex medical condition. '
                    'That level of certainty is '
                    'never accurate in medicine.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    '"Cures depression permanently '
                    'in 100% of cases" is the '
                    'fabricated claim. Quarantine '
                    'that sentence as an '
                    'Accuracy violation.'),
            },
        ],
    },
    {
        'node_id':         'fac_node_05',
        'title':           'Purpose',
        'focus':           'Quarantining sentences '
                           'that show extreme bias '
                           'or hidden agendas',
        'craap_criterion': 'PURPOSE',
        'micro_lesson_text': (
            'Purpose asks: Why was this '
            'information created? To inform, '
            'persuade, sell, or entertain? '
            'Look for emotionally charged '
            'language, one-sided arguments '
            'with no acknowledgment of '
            'opposing views, propaganda '
            'techniques, or hidden commercial '
            'and political agendas disguised '
            'as factual reporting.'
        ),
        'reading_passage': (
            'Social media platforms have '
            'transformed how people consume '
            'news and information. '
            'Researchers have documented both '
            'positive and negative effects of '
            'social media on adolescent '
            'mental health. '
            'Anyone who uses social media '
            'is destroying their brain and '
            'is too stupid to think for '
            'themselves — delete all accounts '
            'immediately. '
            'Studies suggest that mindful '
            'and limited social media use '
            'can coexist with healthy '
            'development. '
            'Digital literacy education '
            'helps young people navigate '
            'online information critically.'
        ),
        'word_count': 86,
        'article_sentences': [
            {
                'sentence_id': 's1',
                'text': (
                    'Social media platforms have '
                    'transformed how people consume '
                    'news and information.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's2',
                'text': (
                    'Researchers have documented '
                    'both positive and negative '
                    'effects of social media on '
                    'adolescent mental health.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's3',
                'text': (
                    'Anyone who uses social media '
                    'is destroying their brain '
                    'and is too stupid to think '
                    'for themselves — delete all '
                    'accounts immediately.'),
                'is_flawed':   True,
                'flaw_reason': (
                    'This sentence uses extreme, '
                    'insulting language ("too '
                    'stupid"), makes sweeping '
                    'generalizations, and issues '
                    'a manipulative command. '
                    'This is propaganda-style '
                    'writing that fails the '
                    'Purpose criterion completely.'),
            },
            {
                'sentence_id': 's4',
                'text': (
                    'Studies suggest that mindful '
                    'and limited social media use '
                    'can coexist with healthy '
                    'development.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
            {
                'sentence_id': 's5',
                'text': (
                    'Digital literacy education '
                    'helps young people navigate '
                    'online information '
                    'critically.'),
                'is_flawed':   False,
                'flaw_reason': '',
            },
        ],
        'sentence_explanations': {
            's1': (
                'This is a neutral, factual '
                'observation. No bias or '
                'hidden agenda here.'),
            's2': (
                'This sentence presents both '
                'sides of the research — '
                'balanced and fair. Not a '
                'Purpose violation.'),
            's4': (
                'This is a measured, evidence-'
                'based statement. Not biased.'),
            's5': (
                'This is an informative, '
                'constructive claim. No hidden '
                'agenda present.'),
        },
        'scaffold_hints': [
            {
                'tier': 1,
                'hint_text': (
                    'One sentence uses very '
                    'strong, emotional language '
                    'and tells the reader what '
                    'to do. Purpose checks for '
                    'manipulation and bias.'),
            },
            {
                'tier': 2,
                'hint_text': (
                    'Look for a sentence that '
                    'insults the reader or uses '
                    'extreme generalizations '
                    'to push a viewpoint.'),
            },
            {
                'tier': 3,
                'hint_text': (
                    'The sentence calling users '
                    '"too stupid" and ordering '
                    'them to delete accounts '
                    'is extreme bias. '
                    'Quarantine it as a '
                    'Purpose violation.'),
            },
        ],
    },
]

for node_data in FACT_SCANNER_NODES:
    if not ArticleDocument.objects(
            node_id=node_data['node_id']).first():
        ArticleDocument(**node_data).save()
        print(f"Seeded {node_data['node_id']}: "
              f"{node_data['title']}")
    else:
        print(f"Already exists: "
              f"{node_data['node_id']}")