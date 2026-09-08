# backend/api/modules/snap_gap/mongo_models.py
import mongoengine as me

class SentencePair(me.EmbeddedDocument):
    pair_id    = me.StringField(required=True)
    sentence_a = me.StringField(required=True)
    sentence_b = me.StringField(required=True)

class ScaffoldHint(me.EmbeddedDocument):
    tier      = me.IntField(required=True)
    hint_text = me.StringField(required=True)

class CoherenceNodeDocument(me.Document):
    node_id           = me.StringField(
                            required=True,
                            unique=True)
    track             = me.StringField(
                            default='analysis')
    title             = me.StringField()
    focus             = me.StringField()
    micro_lesson_text = me.StringField()
    reading_passage   = me.StringField()
    word_count        = me.IntField(default=0)
    sentence_pairs    = me.EmbeddedDocumentListField(
                            SentencePair)
    transition_tile_dock = me.ListField(
                               me.StringField())
    correct_tile_map  = me.DictField()
    tile_error_explanations = me.DictField()
    scaffold_hints    = me.EmbeddedDocumentListField(
                            ScaffoldHint)

    meta = {'collection': 'coherence_nodes'}

    def get_correct_tile(self,
                         pair_id: str) -> str:
        return self.correct_tile_map.get(
            pair_id, '')

    def get_tile_explanation(self,
                             pair_id: str,
                             tile: str) -> str:
        return self.tile_error_explanations.get(
            f'{pair_id}__{tile}',
            'That transition does not fit here. '
            'Re-read both sentences and look for '
            'the logical relationship.')

    def get_hint(self, tier: int) -> str:
        for h in self.scaffold_hints:
            if h.tier == tier:
                return h.hint_text
        return ''