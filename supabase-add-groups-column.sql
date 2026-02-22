-- Migration: Add groups_data column to sessions table
-- Run this in your Supabase SQL Editor

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS groups_data JSONB;
