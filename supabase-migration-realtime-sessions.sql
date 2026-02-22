-- Migration: Enable Realtime for Sessions Table
-- Run this in your Supabase SQL Editor if you already ran the initial schema

-- Enable realtime for sessions table to broadcast status changes
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
