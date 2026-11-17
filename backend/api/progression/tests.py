# backend/api/progression/tests.py
from django.test import TestCase

from api.progression.mongo_models import StudentProfileDocument
from api.progression.services import ProgressionManagementService


class ProgressionXpAndMasteryTests(TestCase):
    def setUp(self):
        StudentProfileDocument.drop_collection()

    def test_tc_prog_002_first_mastery_zero_hints_awards_125_xp(self):
        """TC-PROG-002: First-time mastery with zero hints awards 100 base + 25 bonus = 125 XP."""
        result = ProgressionManagementService.update_progression(
            student_id='student_1',
            node_id='log_node_01',
            hints_used=0,
        )

        self.assertEqual(result['xp_awarded'], 125)
        self.assertEqual(result['streak'], 1)
        self.assertEqual(result['completed_node'], 'log_node_01')

        profile = StudentProfileDocument.objects.get(student_id='student_1')
        self.assertIn('log_node_01', profile.completed_nodes)
        self.assertIn('log_node_01', profile.mastered_nodes)

    def test_tc_prog_003_first_mastery_with_hints_awards_100_xp(self):
        """TC-PROG-003: First-time mastery after using hints forfeits bonus -> 100 XP awarded."""
        result = ProgressionManagementService.update_progression(
            student_id='student_2',
            node_id='log_node_01',
            hints_used=2,
        )

        self.assertEqual(result['xp_awarded'], 100)
        profile = StudentProfileDocument.objects.get(student_id='student_2')
        self.assertIn('log_node_01', profile.completed_nodes)
        self.assertIn('log_node_01', profile.mastered_nodes)

    def test_tc_prog_004_remastering_completed_node_awards_replay_25_xp(self):
        """TC-PROG-004: Re-mastering a previously completed node awards 25 XP (replay)."""
        # First completion
        first_result = ProgressionManagementService.update_progression(
            student_id='student_3',
            node_id='log_node_01',
            hints_used=0,
        )
        self.assertEqual(first_result['xp_awarded'], 125)

        # Re-mastering the same node again
        remaster_result = ProgressionManagementService.update_progression(
            student_id='student_3',
            node_id='log_node_01',
            hints_used=0,
        )

        self.assertEqual(remaster_result['xp_awarded'], 25)

    def test_tc_prog_004_remastering_after_reset_awards_replay_25_xp(self):
        """TC-PROG-004: Re-mastering a node after it was reset awards 25 XP (not first-time 125)."""
        # First completion: 125 XP
        first_result = ProgressionManagementService.update_progression(
            student_id='student_4',
            node_id='snp_node_01',
            hints_used=0,
        )
        self.assertEqual(first_result['xp_awarded'], 125)

        # Reset node
        reset_profile = ProgressionManagementService.reset_node(
            student_id='student_4',
            node_id='snp_node_01',
        )
        self.assertNotIn('snp_node_01', reset_profile.completed_nodes)
        self.assertIn('snp_node_01', reset_profile.mastered_nodes)

        # Master again after reset
        remaster_result = ProgressionManagementService.update_progression(
            student_id='student_4',
            node_id='snp_node_01',
            hints_used=0,
        )

        self.assertEqual(remaster_result['xp_awarded'], 25)
