import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Update session title
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionCode, title } = await request.json();

    if (!sessionCode || title === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get session and verify user is the host
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, host_clerk_id')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if user is the host
    if (session.host_clerk_id !== userId) {
      return NextResponse.json(
        { error: 'Only the host can update the session title' },
        { status: 403 },
      );
    }

    // Update the title
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ title })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session title' },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: updatedSession }, { status: 200 });
  } catch (error) {
    console.error('Error in update-title endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
