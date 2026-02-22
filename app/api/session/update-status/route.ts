import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionCode, status } = await request.json();

    if (!sessionCode || !status) {
      return NextResponse.json(
        { error: 'Session code and status required' },
        { status: 400 },
      );
    }

    // Validate status
    const validStatuses = ['waiting', 'grouping', 'done'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: waiting, grouping, or done' },
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
        { error: 'Only the host can update the session status' },
        { status: 403 },
      );
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ status })
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
        message: 'Session status updated successfully',
        status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in update-status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
