import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET user profile
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get or create user profile
    let { data: user, error } = await supabase
      .from('users')
      .select('id, clerk_id, email, saved_summary, created_at')
      .eq('clerk_id', userId)
      .single();

    // If user doesn't exist, create them
    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          saved_summary: '',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 },
        );
      }

      user = newUser;
    } else if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 },
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error in profile GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// UPDATE user profile
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saved_summary } = await request.json();

    if (saved_summary === undefined) {
      return NextResponse.json(
        { error: 'saved_summary is required' },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Update user's saved summary
    const { data: user, error } = await supabase
      .from('users')
      .update({ saved_summary })
      .eq('clerk_id', userId)
      .select()
      .single();

    // If user doesn't exist, create them with the summary
    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_id: userId,
          saved_summary,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 },
        );
      }

      return NextResponse.json({ user: newUser }, { status: 200 });
    } else if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 },
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error in profile PATCH endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
