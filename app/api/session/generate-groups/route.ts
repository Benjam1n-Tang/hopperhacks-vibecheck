import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

interface Participant {
  id: string;
  display_name: string;
  summary: string;
}

interface Group {
  id: number;
  members: Participant[];
  explanation?: string;
}

// Helper function to add delay between API calls
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAI(prompt: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const client = new OpenAI({
    baseURL: 'https://models.github.ai/inference',
    apiKey: token,
  });

  try {
    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for group formation.',
        },
        { role: 'user', content: prompt },
      ],
      model: 'openai/gpt-4o-mini',
      temperature: 1,
      max_tokens: 4096,
      top_p: 1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error(
        'Empty content. Full response:',
        JSON.stringify(response, null, 2),
      );
      throw new Error('AI API returned empty response');
    }

    return content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
}

function balanceGroups(
  participants: Participant[],
  groupSize: number,
): Group[] {
  const totalParticipants = participants.length;

  // Calculate optimal number of groups
  let numGroups = Math.ceil(totalParticipants / groupSize);

  // Check if this creates an imbalanced group
  const remainder = totalParticipants % groupSize;

  // If remainder is 1 and we have more than 1 group, redistribute
  if (remainder === 1 && numGroups > 1) {
    // Reduce group size by 1 to better balance
    numGroups = Math.ceil(totalParticipants / (groupSize - 1));
  }

  // Calculate members per group
  const baseSize = Math.floor(totalParticipants / numGroups);
  const extraMembers = totalParticipants % numGroups;

  const groups: Group[] = [];
  let participantIndex = 0;

  for (let i = 0; i < numGroups; i++) {
    const currentGroupSize = baseSize + (i < extraMembers ? 1 : 0);
    const groupMembers = participants.slice(
      participantIndex,
      participantIndex + currentGroupSize,
    );

    groups.push({
      id: i + 1,
      members: groupMembers,
    });

    participantIndex += currentGroupSize;
  }

  return groups;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionCode, groupSize } = await request.json();

    if (!sessionCode || !groupSize) {
      return NextResponse.json(
        { error: 'Session code and group size required' },
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
        { error: 'Only the host can generate groups' },
        { status: 403 },
      );
    }

    // Fetch all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, display_name, summary')
      .eq('session_id', session.id);

    if (participantsError || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'No participants found' },
        { status: 404 },
      );
    }

    console.log(
      `Grouping ${participants.length} participants into groups of ${groupSize}`,
    );

    // Prepare participant data for Gemini
    const participantList = participants
      .map(
        (p, i) =>
          `${i + 1}. ${p.display_name}: ${p.summary || '[No summary provided]'}`,
      )
      .join('\n');

    // Ask AI to analyze and sort participants
    const sortingPrompt = `You are a group formation AI. Analyze these participants and sort them by similarity in interests, personality, and preferences. Group people who would work well together.

Participants:
${participantList}

Task: Return ONLY a JSON array of participant indices (1-based) in the optimal order for grouping. Sort so that similar people are adjacent. If a participant has no summary or minimal info, place them randomly.

Format your response as a valid JSON array of numbers, nothing else. Example: [3, 7, 1, 5, 2, 4, 6]`;

    console.log('Calling AI to sort participants...');
    const sortingResponse = await callAI(sortingPrompt);

    // Parse the sorting order
    let sortedIndices: number[];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = sortingResponse.match(/\[[\d,\s]+\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      sortedIndices = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Failed to parse AI response:', sortingResponse);
      // Fallback to original order
      sortedIndices = participants.map((_, i) => i + 1);
    }

    // Reorder participants based on Gemini's sorting
    const sortedParticipants = sortedIndices
      .map((idx) => participants[idx - 1])
      .filter((p) => p !== undefined);

    // Balance groups properly
    const groups = balanceGroups(sortedParticipants, groupSize);

    console.log(`Created ${groups.length} groups`);

    // Add delay before starting explanation calls
    await sleep(1000);

    // Generate explanations for each group using AI
    for (const group of groups) {
      const groupSummaries = group.members
        .map((m) => `- ${m.display_name}: ${m.summary || '[No summary]'}`)
        .join('\n');

      const hasEmptySummaries = group.members.some(
        (m) => !m.summary || m.summary.trim() === '',
      );

      let explanationPrompt: string;

      if (
        hasEmptySummaries &&
        group.members.every((m) => !m.summary || m.summary.trim() === '')
      ) {
        // All members have empty summaries
        group.explanation =
          'These members were grouped randomly since no one provided a summary about themselves.';
      } else if (hasEmptySummaries) {
        // Mix of empty and filled summaries
        explanationPrompt = `Explain in 2-3 sentences why this group works well together. Some members didn't provide summaries, so mention they were placed to balance the group.

Group members:
${groupSummaries}

Keep it friendly and encouraging.`;
        group.explanation = await callAI(explanationPrompt);
        // Add delay to avoid rate limiting
        await sleep(1000);
      } else {
        // All members have summaries
        explanationPrompt = `Explain in 2-3 sentences why this group works well together based on their interests and personalities. Be specific about common interests.

Group members:
${groupSummaries}

Keep it friendly and encouraging.`;
        group.explanation = await callAI(explanationPrompt);
        // Add delay to avoid rate limiting
        await sleep(1000);
      }
    }

    // Update session with status and store groups as JSON
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'grouping',
        group_size: groupSize,
        groups_data: groups,
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to save groups' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: 'Groups generated successfully',
        groups,
        sessionId: session.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in generate-groups endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
