-- Add title column to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';

-- Update existing sessions to have a default title
UPDATE sessions 
SET title = 'Untitled Session' 
WHERE title = '' OR title IS NULL;
