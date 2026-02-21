import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { sessionCode, displayName, summary, clerkId } = await request.json();

    if (!sessionCode || !displayName || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', sessionCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Add participant to the session
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        clerk_id: clerkId || null,
        display_name: displayName,
        summary: summary,
      })
      .select()
      .single();

    if (participantError) {
      console.error('Error adding participant:', participantError);
      return NextResponse.json(
        { error: 'Failed to add participant' },
        { status: 500 },
      );
    }

    return NextResponse.json({ participant }, { status: 201 });
  } catch (error) {
    console.error('Error in join endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
