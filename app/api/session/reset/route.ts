import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionCode } = await request.json();

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Verify the user is the host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, host_clerk_id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_clerk_id !== userId) {
      return NextResponse.json(
        { error: 'Only the host can reset the session' },
        { status: 403 },
      );
    }

    // Delete all participants (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('participants')
      .delete()
      .eq('session_id', session.id);

    if (deleteError) {
      console.error('Error deleting participants:', deleteError);
      return NextResponse.json(
        { error: 'Failed to reset session' },
        { status: 500 },
      );
    }

    // Reset session status to waiting
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ status: 'waiting' })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating session status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session status' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: 'Session reset successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in reset endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
