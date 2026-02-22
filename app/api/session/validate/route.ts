import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { sessionCode } = await request.json();

    if (!sessionCode) {
      return NextResponse.json(
        { error: 'Session code is required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, code')
      .eq('code', sessionCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', exists: false },
        { status: 404 },
      );
    }

    return NextResponse.json({ exists: true, session }, { status: 200 });
  } catch (error) {
    console.error('Error validating session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
