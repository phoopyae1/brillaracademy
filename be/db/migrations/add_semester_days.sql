-- Migration: Add start_day and end_day columns to semester_dates table
-- These fields store the day of the week (Monday, Tuesday, etc.) for when the semester starts and ends

ALTER TABLE semester_dates 
ADD COLUMN IF NOT EXISTS start_day TEXT,
ADD COLUMN IF NOT EXISTS end_day TEXT;

-- Add check constraint to ensure valid day names
ALTER TABLE semester_dates
DROP CONSTRAINT IF EXISTS check_start_day,
DROP CONSTRAINT IF EXISTS check_end_day;

ALTER TABLE semester_dates
ADD CONSTRAINT check_start_day CHECK (start_day IS NULL OR start_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
ADD CONSTRAINT check_end_day CHECK (end_day IS NULL OR end_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));

