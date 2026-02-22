-- Migration: Add Groups Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  group_number INT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, group_number)
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, participant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_groups_session ON groups(session_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_participant ON group_members(participant_id);

-- RLS Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Host can create groups" ON groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view group members" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "Host can add group members" ON group_members
  FOR INSERT WITH CHECK (true);

-- Enable Realtime for groups
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
