import mongoengine as me

class ParagraphBlock(me.EmbeddedDocument):
    block_id = me.StringField(required=True)
    text     = me.StringField(required=True)
    order    = me.IntField()

class ScaffoldHint(me.EmbeddedDocument):
    tier      = me.IntField(required=True)
    hint_text = me.StringField(required=True)

class LogicThreadNodeDocument(me.Document):
    node_id           = me.StringField(
                            required=True, unique=True)
    track             = me.StringField(default='analysis')
    title             = me.StringField()
    focus             = me.StringField()
    micro_lesson_text = me.StringField()
    reading_passage   = me.StringField()
    word_count        = me.IntField(default=0)
    paragraph_blocks  = me.EmbeddedDocumentListField(
                            ParagraphBlock)
    correct_sequence  = me.ListField(me.StringField())
    structural_explanations = me.DictField()
    scaffold_hints    = me.EmbeddedDocumentListField(
                            ScaffoldHint)

    meta = {'collection': 'logic_thread_nodes'}

    def get_explanation(self, src: str,
                        tgt: str) -> str:
        return self.structural_explanations.get(
            f'{src}__{tgt}',
            'That connection is not structurally '
            'correct. Re-evaluate the logical '
            'relationship.')

    def get_hint(self, tier: int) -> str:
        for h in self.scaffold_hints:
            if h.tier == tier:
                return h.hint_text
        return ''