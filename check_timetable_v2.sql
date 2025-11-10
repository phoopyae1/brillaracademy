-- Check what's in student 32's timetable
\echo 'Timetable entries for student 32:'
SELECT id, subject, weekday, 
       to_char(start_time, 'HH24:MI') as start_time,
       to_char(end_time, 'HH24:MI') as end_time,
       location
FROM timetables 
WHERE student_id = 32
ORDER BY weekday, start_time;

\echo ''
\echo 'Class registrations for student 32:'
SELECT id, class_name, instructor, status, semester
FROM class_registrations 
WHERE student_id = 32;
