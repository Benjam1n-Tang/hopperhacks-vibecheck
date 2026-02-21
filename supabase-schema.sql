-- VibeCheck Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for session status
CREATE TYPE session_status AS ENUM ('waiting', 'grouping', 'done');

-- Create users table (synced from Clerk webhooks)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  saved_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  host_clerk_id TEXT NOT NULL,
  status session_status DEFAULT 'waiting',
  group_size INT DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  clerk_id TEXT,
  display_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pinned_pairs table
CREATE TABLE IF NOT EXISTS pinned_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  pinned_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  UNIQUE(session_id, participant_id, pinned_participant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_host ON sessions(host_clerk_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_clerk ON participants(clerk_id);
CREATE INDEX IF NOT EXISTS idx_pinned_pairs_session ON pinned_pairs(session_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions (anyone can read, only host can modify)
CREATE POLICY "Anyone can view sessions" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only host can update their session" ON sessions
  FOR UPDATE USING (host_clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for participants (anyone can read and join)
CREATE POLICY "Anyone can view participants" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as participant" ON participants
  FOR INSERT WITH CHECK (true);

-- RLS Policies for pinned_pairs
CREATE POLICY "Anyone can view pinned pairs" ON pinned_pairs
  FOR SELECT USING (true);

CREATE POLICY "Participants can create pins" ON pinned_pairs
  FOR INSERT WITH CHECK (true);

-- Setup Realtime for participants table
-- This enables real-time updates when participants join
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
