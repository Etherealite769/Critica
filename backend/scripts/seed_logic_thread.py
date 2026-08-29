import os
import sys

# Force current working directory (backend) into Python path
sys.path.insert(0, os.getcwd())

import mongoengine as me
from dotenv import load_dotenv

from api.modules.logic_thread.mongo_models import (
    LogicThreadNodeDocument,
    ExerciseDocument,
    ParagraphBlock,
    ScaffoldHint,
)
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if MONGODB_URI:
    # Use full Atlas URI (includes host, db, credentials)
    me.connect(host=MONGODB_URI)
else:
    # Fallback local connection
    me.connect(db="CriticaDB", host="mongodb://localhost:27017/CriticaDB")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/CriticaDB")

me.connect(
    db="CriticaDB",
    host=MONGODB_URI
)


def create_exercise(
    exercise_id: str,
    p1_text: str,
    p2_text: str,
    explanation_text: str,
    tier1_hint: str,
    tier2_hint: str,
    tier3_hint: str
) -> ExerciseDocument:
    """Helper utility to construct ExerciseDocuments with calculated word counts."""
    full_passage = f"{p1_text} {p2_text}"
    word_count = len(full_passage.split())

    return ExerciseDocument(
        exercise_id=exercise_id,
        reading_passage=full_passage,
        word_count=word_count,
        paragraph_blocks=[
            ParagraphBlock(block_id="p1", text=p1_text, order=1),
            ParagraphBlock(block_id="p2", text=p2_text, order=2)
        ],
        correct_sequence=["p1", "p2"],
        structural_explanations={
            "p2__p1": explanation_text
        },
        scaffold_hints=[
            ScaffoldHint(tier=1, hint_text=tier1_hint),
            ScaffoldHint(tier=2, hint_text=tier2_hint),
            ScaffoldHint(tier=3, hint_text=tier3_hint)
        ]
    )


def seed_logic_thread():
    node_id = "logic_test_01"

    exercises = [
        create_exercise(
            exercise_id="logic_test_01_ex_01",
            p1_text="Plants require sunlight to produce energy.",
            p2_text="This energy allows them to grow and develop.",
            explanation_text="The second sentence refers to energy produced by the first sentence, so p1 must come first.",
            tier1_hint="Look for the sentence that introduces the main idea.",
            tier2_hint="The word 'This' refers to something mentioned earlier.",
            tier3_hint="The correct sequence is p1 followed by p2."
        ),
        create_exercise(
            exercise_id="logic_test_01_ex_02",
            p1_text="Maria studied for the examination.",
            p2_text="She reviewed her notes and practiced sample questions.",
            explanation_text="The second sentence explains how Maria studied, so it follows the general statement.",
            tier1_hint="Find the sentence that introduces Maria's action.",
            tier2_hint="The second sentence gives specific details.",
            tier3_hint="The correct sequence is p1 followed by p2."
        ),
        create_exercise(
            exercise_id="logic_test_01_ex_03",
            p1_text="The city experienced heavy rainfall throughout the night.",
            p2_text="Several roads were flooded the following morning.",
            explanation_text="The flooding is an effect of the heavy rainfall, so the cause must appear first.",
            tier1_hint="Look for a cause-and-effect relationship.",
            tier2_hint="Heavy rainfall caused the roads to flood.",
            tier3_hint="Rainfall comes before flooding."
        ),
        create_exercise(
            exercise_id="logic_test_01_ex_04",
            p1_text="Online learning provides students with flexible schedules.",
            p2_text="However, students must manage their time effectively.",
            explanation_text="The second sentence presents a limitation of the benefit described in the first sentence.",
            tier1_hint="Look for the sentence presenting the benefit.",
            tier2_hint="The word 'However' introduces a contrasting idea.",
            tier3_hint="The flexible schedule comes before its limitation."
        ),
        create_exercise(
            exercise_id="logic_test_01_ex_05",
            p1_text="Recycling reduces the amount of waste sent to landfills.",
            p2_text="It also helps conserve natural resources.",
            explanation_text="The second sentence adds another benefit of recycling after the first benefit has been introduced.",
            tier1_hint="Look for the sentence introducing recycling.",
            tier2_hint="The second sentence adds another benefit.",
            tier3_hint="The correct sequence is p1 followed by p2."
        )
    ]

    # Look up existing document or prepare a new instance
    lesson = LogicThreadNodeDocument.objects(node_id=node_id).first()
    if not lesson:
        lesson = LogicThreadNodeDocument(node_id=node_id)

    # Set document properties
    lesson.track = "analysis"
    lesson.title = "Understanding Logical Sequence"
    lesson.focus = "Identify the logical order of ideas in a passage."
    lesson.difficulty = "intermediate"
    lesson.micro_lesson_text = (
        "A logical sequence organizes ideas so that each sentence "
        "naturally follows the previous one."
    )
    lesson.xp_reward = 100
    lesson.exercises = exercises

    # Save upserted document
    lesson.save()

    print("Logic Thread test lesson seeded successfully.")
    print(f"Node ID: {lesson.node_id}")
    print(f"Total Exercises Seeded: {len(lesson.exercises)}")


if __name__ == "__main__":
    seed_logic_thread()