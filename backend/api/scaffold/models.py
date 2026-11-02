from django.db import models
from django.utils import timezone

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
    # "case" (exercise submit), "step" (tap / tile / scan), "hint" (feedback request).
    # "" marks rows logged before event types existed.
    event_type         = models.CharField(
                             max_length=10,
                             blank=True, default='')
    # UUID shared with the Mongo copy of the same event ("" on old rows)
    event_id           = models.CharField(
                             max_length=36,
                             blank=True, default='',
                             db_index=True)
    is_correct         = models.BooleanField(default=False)
    hint_used          = models.BooleanField(default=False)
    hint_tier          = models.IntegerField(default=0)
    consecutive_errors = models.IntegerField(default=0)
    inactivity_trigger = models.BooleanField(default=False)
    # Set explicitly by log_attempt so both stores carry the same instant
    timestamp          = models.DateTimeField(
                             default=timezone.now)

    class Meta:
        app_label = 'scaffold'
        db_table  = 'telemetry_logs'
