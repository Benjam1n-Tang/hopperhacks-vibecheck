import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Generate a 6-character alphanumeric code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get the full user details from Clerk
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || null;

    // Ensure user exists in Supabase users table (upsert)
    const { error: userError } = await supabase.from('users').upsert(
      {
        clerk_id: userId,
        email: email,
      },
      {
        onConflict: 'clerk_id',
        ignoreDuplicates: false,
      },
    );

    if (userError) {
      console.error('Error upserting user:', userError);
      // Continue anyway - the user might already exist
    }

    // Generate unique session code and ensure it's not already in use
    let code = generateCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('sessions')
        .select('code')
        .eq('code', code)
        .single();

      if (!existing) {
        isUnique = true;
      } else {
        code = generateCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique code' },
        { status: 500 },
      );
    }

    // Create session in Supabase
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        code: code,
        host_clerk_id: userId,
        status: 'waiting',
        group_size: 4, // Default group size
        title: 'Untitled Session',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ code: session.code }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 },
    );
  }
}
