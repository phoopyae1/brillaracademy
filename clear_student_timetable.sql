-- Clear timetable for student 32 (for testing)
DELETE FROM timetables WHERE student_id = 32;
DELETE FROM class_registrations WHERE student_id = 32;
DELETE FROM teacher_rosters WHERE student_id = 32;
DELETE FROM classroom_registrations WHERE student_id = 32;
SELECT 'Cleared all registrations for student 32' as result;
