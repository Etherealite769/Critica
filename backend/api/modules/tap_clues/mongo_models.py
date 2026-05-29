# backend/api/modules/tap_clues/mongo_models.py
import mongoengine as me

class LockedWord(me.EmbeddedDocument):
    word_id          = me.StringField(required=True)
    word             = me.StringField(required=True)
    position_index   = me.IntField()
    correct_clue_ids = me.ListField(me.StringField())
    definition       = me.StringField()
    contextual_usage = me.StringField()
    translation      = me.StringField()

class ScaffoldHint(me.EmbeddedDocument):
    tier      = me.IntField(required=True)
    hint_text = me.StringField(required=True)

class VocabularyNodeDocument(me.Document):
    node_id           = me.StringField(
                            required=True,
                            unique=True)
    track             = me.StringField(
                            default='interpretation')
    title             = me.StringField()
    focus             = me.StringField()
    micro_lesson_text = me.StringField()
    reading_passage   = me.StringField()
    word_count        = me.IntField(default=0)
    locked_words      = me.EmbeddedDocumentListField(
                            LockedWord)
    clue_error_explanations = me.DictField()
    scaffold_hints    = me.EmbeddedDocumentListField(
                            ScaffoldHint)

    meta = {'collection': 'vocabulary_nodes'}

    def get_locked_word(self, word_id: str):
        for w in self.locked_words:
            if w.word_id == word_id:
                return w
        return None

    def get_clue_explanation(self,
                             word_id: str,
                             clue_word: str) -> str:
        return self.clue_error_explanations.get(
            f'{word_id}__{clue_word}',
            'That word is not a valid context '
            'clue. Look for synonyms, definitions, '
            'or examples near the locked word.')

    def get_hint(self, tier: int) -> str:
        for h in self.scaffold_hints:
            if h.tier == tier:
                return h.hint_text
        return ''

    def get_all_word_ids(self) -> list:
        return [w.word_id for w in self.locked_words]