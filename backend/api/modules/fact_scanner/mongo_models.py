# backend/api/modules/fact_scanner/mongo_models.py
import mongoengine as me

class ArticleSentence(me.EmbeddedDocument):
    sentence_id  = me.StringField(required=True)
    text         = me.StringField(required=True)
    is_flawed    = me.BooleanField(default=False)
    flaw_reason  = me.StringField(default='')

class ScaffoldHint(me.EmbeddedDocument):
    tier      = me.IntField(required=True)
    hint_text = me.StringField(required=True)

class ArticleDocument(me.Document):
    node_id          = me.StringField(
                           required=True,
                           unique=True)
    track            = me.StringField(
                           default='evaluation')
    title            = me.StringField()
    focus            = me.StringField()
    craap_criterion  = me.StringField()
    micro_lesson_text = me.StringField()
    reading_passage  = me.StringField()
    word_count       = me.IntField(default=0)
    article_sentences = me.EmbeddedDocumentListField(
                            ArticleSentence)
    sentence_explanations = me.DictField()
    scaffold_hints   = me.EmbeddedDocumentListField(
                           ScaffoldHint)

    meta = {'collection': 'fact_scanner_articles'}

    def get_sentence(self,
                     sentence_id: str):
        for s in self.article_sentences:
            if s.sentence_id == sentence_id:
                return s
        return None

    def get_sentence_explanation(
            self, sentence_id: str) -> str:
        return self.sentence_explanations.get(
            sentence_id,
            'That sentence does not violate '
            'the CRAAP criterion being tested. '
            'Re-read the micro-lesson and apply '
            'the criterion carefully.')

    def get_hint(self, tier: int) -> str:
        for h in self.scaffold_hints:
            if h.tier == tier:
                return h.hint_text
        return ''

    def get_all_flawed_ids(self) -> list:
        return [
            s.sentence_id
            for s in self.article_sentences
            if s.is_flawed
        ]