from django.db import models

class TelemetryLog(models.Model):
    student_id         = models.CharField(max_length=100)
    node_id            = models.CharField(max_length=100)
    module             = models.CharField(max_length=50)
    word_id            = models.CharField(
                             max_length=100,
                             blank=True, default='')
    clue_word_id       = models.CharField(
                             max_length=100,
                             blank=True, default='')
    is_correct         = models.BooleanField(default=False)
    hint_used          = models.BooleanField(default=False)
    hint_tier          = models.IntegerField(default=0)
    consecutive_errors = models.IntegerField(default=0)
    inactivity_trigger = models.BooleanField(default=False)
    timestamp          = models.DateTimeField(
                             auto_now_add=True)

    class Meta:
        app_label = 'scaffold'
        db_table  = 'telemetry_logs'