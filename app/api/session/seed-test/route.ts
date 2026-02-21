import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Random names for testing
const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Taylor',
  'Morgan',
  'Casey',
  'Riley',
  'Avery',
  'Quinn',
  'Sam',
  'Drew',
  'Charlie',
  'Dakota',
  'River',
  'Skylar',
  'Harper',
  'Rowan',
];

const INTERESTS = [
  'loves coding and coffee',
  'passionate about AI and machine learning',
  'enjoys reading sci-fi novels',
  'loves hiking and outdoor adventures',
  'into music and playing guitar',
  'passionate about cooking and trying new recipes',
  'enjoys photography and visual arts',
  'loves gaming and esports',
  'into fitness and staying active',
  'passionate about environmental conservation',
  'enjoys writing and creative storytelling',
  'loves traveling and exploring new cultures',
  'into yoga and mindfulness',
  'passionate about entrepreneurship',
  'enjoys board games and strategy games',
];

function generateRandomParticipant() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const number = Math.floor(Math.random() * 100);
  const interest = INTERESTS[Math.floor(Math.random() * INTERESTS.length)];

  return {
    displayName: `${firstName}${number}`,
    summary: `Hey! I'm ${firstName} and I ${interest}. Looking forward to meeting everyone!`,
  };
}

export async function POST(request: Request) {
  try {
    const { sessionCode, count = 5 } = await request.json();

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate and insert random participants
    const participants = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const { displayName, summary } = generateRandomParticipant();
      participants.push({
        session_id: session.id,
        display_name: displayName,
        summary: summary,
        clerk_id: null,
      });
    }

    const { data, error } = await supabase
      .from('participants')
      .insert(participants)
      .select();

    if (error) {
      console.error('Error adding test participants:', error);
      return NextResponse.json(
        { error: 'Failed to add participants' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: `Added ${data.length} test participants`,
        participants: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in seed endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
