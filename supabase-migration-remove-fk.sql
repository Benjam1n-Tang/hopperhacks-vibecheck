-- Migration: Remove Foreign Key Constraint (Optional)
-- This removes the foreign key constraint if you want more flexibility
-- Run this ONLY if you're still having issues after the code fix

-- Check if the constraint exists
SELECT conname 
FROM pg_constraint 
WHERE conname = 'sessions_host_clerk_id_fkey';

-- If it exists, drop it
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_host_clerk_id_fkey;

-- Optionally, you can add it back as a "soft" reference without enforcement
-- This allows sessions to be created even if the user doesn't exist yet
-- (Not recommended for production, but useful for development)
