import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Check if participant exists and is not a test user
    const { data: participant, error: fetchError } = await supabase
      .from('participants')
      .select('clerk_id, display_name')
      .eq('id', participantId)
      .single();

    if (fetchError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 },
      );
    }

    // Only allow removal of real users (those with clerk_id or non-generated names)
    // Test users (generated) have clerk_id = null and specific naming pattern
    const isTestUser =
      !participant.clerk_id &&
      (participant.display_name.includes('Generated') ||
        /^[A-Za-z]+\d+$/.test(participant.display_name)); // e.g., "Alex42", "Jordan17"

    if (isTestUser) {
      return NextResponse.json(
        { error: 'Cannot remove test/generated participants' },
        { status: 403 },
      );
    }

    // Delete the participant
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantId);

    if (deleteError) {
      console.error('Error deleting participant:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove participant' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: 'Participant removed successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in remove-participant endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
