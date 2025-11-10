-- Check what's in the student's timetable
SELECT id, student_id, subject, weekday, 
       to_char(start_time, 'HH24:MI') as start_time,
       to_char(end_time, 'HH24:MI') as end_time,
       location
FROM timetables 
WHERE student_id = 32
ORDER BY weekday, start_time;
