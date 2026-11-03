"""
Rewrites the micro_lesson_text of every exercise node from scripts/micro_lessons.json.

Only micro_lesson_text changes (a $set on that one field); title, focus, exercises and
every other field are left alone. Only node_ids present in the JSON are touched.

Before writing, every current micro_lesson_text (all four collections) is saved to
scripts/micro_lessons_backup_<timestamp>.json, which is gitignored.

Usage (from backend/):
  python scripts/update_micro_lessons.py --dry-run   # old vs new word counts; writes nothing
  python scripts/update_micro_lessons.py             # back up, then update

log_node_01 is the style reference and is never rewritten unless --include-log-node-01 is given.
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402

django.setup()   # connects mongoengine exactly as config/settings.py does (MONGO_URI from backend/.env)

from api.modules.fact_scanner.mongo_models import ArticleDocument  # noqa: E402
from api.modules.logic_thread.mongo_models import LogicThreadNodeDocument  # noqa: E402
from api.modules.snap_gap.mongo_models import CoherenceNodeDocument  # noqa: E402
from api.modules.tap_clues.mongo_models import VocabularyNodeDocument  # noqa: E402

SCRIPTS = os.path.join(BACKEND, 'scripts')
LESSONS_FILE = os.path.join(SCRIPTS, 'micro_lessons.json')
STYLE_REFERENCE = 'log_node_01'
COLLECTIONS = {
    'logic_thread_nodes': LogicThreadNodeDocument,
    'coherence_nodes': CoherenceNodeDocument,
    'vocabulary_nodes': VocabularyNodeDocument,
    'fact_scanner_articles': ArticleDocument,
}


def words(text):
    return len((text or '').split())


def load_current():
    """{node_id: (collection name, document class, current micro_lesson_text)} for every node."""
    current = {}
    for name, doc in COLLECTIONS.items():
        for row in doc._get_collection().find({}, {'node_id': 1, 'micro_lesson_text': 1, '_id': 0}):
            node_id = row.get('node_id')
            if node_id in current:
                print(f'WARNING: {node_id} appears in both {current[node_id][0]} and {name}')
            current[node_id] = (name, doc, row.get('micro_lesson_text') or '')
    return current


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help='print old vs new word counts and write nothing')
    parser.add_argument('--include-log-node-01', action='store_true',
                        help=f'also rewrite {STYLE_REFERENCE} if the JSON contains it (skipped by default)')
    args = parser.parse_args()

    with open(LESSONS_FILE, encoding='utf-8') as f:
        lessons = json.load(f)
    if STYLE_REFERENCE in lessons and not args.include_log_node_01:
        print(f'Skipping {STYLE_REFERENCE} (style reference); pass --include-log-node-01 to rewrite it.')
        lessons.pop(STYLE_REFERENCE)

    current = load_current()
    not_in_db = sorted(set(lessons) - set(current))
    not_in_json = sorted(set(current) - set(lessons))
    to_update = [nid for nid in sorted(current) if nid in lessons]

    print(f'{"node_id":<13}{"collection":<23}{"old":>5}{"new":>5}  changed')
    for nid in to_update:
        name, _, old = current[nid]
        print(f'{nid:<13}{name:<23}{words(old):>5}{words(lessons[nid]):>5}  {"yes" if old != lessons[nid] else "no (same text)"}')

    print(f'\n{len(to_update)} node(s) to update.')
    if not_in_json:
        print(f'In the DB but not in micro_lessons.json (left unchanged): {", ".join(not_in_json)}')
    if not_in_db:
        print(f'In micro_lessons.json but not in the DB (ignored): {", ".join(not_in_db)}')

    if args.dry_run:
        print('\n[dry run] Nothing was written.')
        return

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup_path = os.path.join(SCRIPTS, f'micro_lessons_backup_{stamp}.json')
    backup = {nid: {'collection': name, 'micro_lesson_text': text} for nid, (name, _, text) in sorted(current.items())}
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f'\nBacked up {len(backup)} micro_lesson_text value(s) to {backup_path}')

    updated = 0
    for nid in to_update:
        name, doc, old = current[nid]
        if old == lessons[nid]:
            continue
        updated += doc.objects(node_id=nid).update_one(set__micro_lesson_text=lessons[nid])
    print(f'Updated micro_lesson_text on {updated} node(s).')


if __name__ == '__main__':
    main()
