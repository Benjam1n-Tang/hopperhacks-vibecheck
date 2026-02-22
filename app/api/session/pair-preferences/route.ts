import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// GET - Fetch all pairing preferences for a session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionCode = searchParams.get('sessionCode');

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get session ID from code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch all pinned pairs for this session
    const { data: pairs, error: pairsError } = await supabase
      .from('pinned_pairs')
      .select(
        `
        participant_id,
        pinned_participant_id,
        participants!pinned_pairs_participant_id_fkey(display_name),
        pinned:participants!pinned_pairs_pinned_participant_id_fkey(display_name)
      `,
      )
      .eq('session_id', session.id);

    if (pairsError) {
      console.error('Error fetching pairs:', pairsError);
      return NextResponse.json(
        { error: 'Failed to fetch pairing preferences' },
        { status: 500 },
      );
    }

    return NextResponse.json({ pairs: pairs || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in pair-preferences GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST - Save pairing preferences
export async function POST(request: Request) {
  try {
    const { sessionCode, participantId, pinnedParticipantIds } =
      await request.json();

    if (!sessionCode || !participantId) {
      return NextResponse.json(
        { error: 'Session code and participant ID required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get session ID from code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete existing preferences for this participant
    await supabase
      .from('pinned_pairs')
      .delete()
      .eq('session_id', session.id)
      .eq('participant_id', participantId);

    // Insert new preferences if any
    if (pinnedParticipantIds && pinnedParticipantIds.length > 0) {
      const pairs = pinnedParticipantIds.map((pinnedId: string) => ({
        session_id: session.id,
        participant_id: participantId,
        pinned_participant_id: pinnedId,
      }));

      const { error: insertError } = await supabase
        .from('pinned_pairs')
        .insert(pairs);

      if (insertError) {
        console.error('Error inserting pairs:', insertError);
        return NextResponse.json(
          { error: 'Failed to save pairing preferences' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { message: 'Pairing preferences saved successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in pair-preferences POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
