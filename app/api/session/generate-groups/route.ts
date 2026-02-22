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
  group_number: number;
  members: Participant[];
  explanation?: string;
}

// Helper function to add delay between API calls
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to find paired clusters (connected components)
function findPairedClusters(
  participants: Participant[],
  pairingPreferences: Array<{
    participant_id: string;
    pinned_participant_id: string;
  }>,
): Set<string>[] {
  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();

  participants.forEach((p) => {
    if (!adjacency.has(p.id)) {
      adjacency.set(p.id, new Set());
    }
  });

  // Add edges for pairing preferences (bidirectional)
  pairingPreferences.forEach((pair) => {
    if (
      adjacency.has(pair.participant_id) &&
      adjacency.has(pair.pinned_participant_id)
    ) {
      adjacency.get(pair.participant_id)!.add(pair.pinned_participant_id);
      adjacency.get(pair.pinned_participant_id)!.add(pair.participant_id);
    }
  });

  // Find connected components using DFS
  const visited = new Set<string>();
  const clusters: Set<string>[] = [];

  function dfs(participantId: string, cluster: Set<string>) {
    visited.add(participantId);
    cluster.add(participantId);

    const neighbors = adjacency.get(participantId) || new Set();
    neighbors.forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        dfs(neighborId, cluster);
      }
    });
  }

  participants.forEach((p) => {
    if (!visited.has(p.id)) {
      const cluster = new Set<string>();
      dfs(p.id, cluster);
      clusters.push(cluster);
    }
  });

  return clusters;
}

// Helper function to split a large cluster into smaller feasible sub-clusters
function splitCluster(
  cluster: Set<string>,
  maxSize: number,
  pairingPreferences: Array<{
    participant_id: string;
    pinned_participant_id: string;
  }>,
): Set<string>[] {
  if (cluster.size <= maxSize) {
    return [cluster];
  }

  // Build internal connection strength map (how many mutual connections within cluster)
  const connectionStrength = new Map<string, number>();
  cluster.forEach((id) => {
    const connections = pairingPreferences.filter(
      (p) =>
        (p.participant_id === id && cluster.has(p.pinned_participant_id)) ||
        (p.pinned_participant_id === id && cluster.has(p.participant_id)),
    ).length;
    connectionStrength.set(id, connections);
  });

  // Sort by connection strength (most connected first)
  const sortedIds = Array.from(cluster).sort(
    (a, b) =>
      (connectionStrength.get(b) || 0) - (connectionStrength.get(a) || 0),
  );

  // Greedily assign to sub-clusters
  const subClusters: Set<string>[] = [];
  let currentSubCluster = new Set<string>();

  for (const id of sortedIds) {
    if (currentSubCluster.size < maxSize) {
      currentSubCluster.add(id);
    } else {
      subClusters.push(currentSubCluster);
      currentSubCluster = new Set<string>([id]);
    }
  }

  if (currentSubCluster.size > 0) {
    subClusters.push(currentSubCluster);
  }

  return subClusters;
}

// Helper function to prioritize and process clusters
function processClusters(
  clusters: Set<string>[],
  groupSize: number,
  pairingPreferences: Array<{
    participant_id: string;
    pinned_participant_id: string;
  }>,
): {
  feasibleClusters: Set<string>[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const feasibleClusters: Set<string>[] = [];

  // Sort clusters by size (smaller first - easier to satisfy)
  const sortedClusters = clusters
    .filter((c) => c.size > 1)
    .sort((a, b) => a.size - b.size);

  for (const cluster of sortedClusters) {
    if (cluster.size <= groupSize) {
      // Cluster fits in one group - keep it
      feasibleClusters.push(cluster);
    } else {
      // Cluster is too large - split it
      warnings.push(
        `Warning: ${cluster.size} people wanted to be grouped together, but max group size is ${groupSize}. Split into smaller groups.`,
      );

      const subClusters = splitCluster(cluster, groupSize, pairingPreferences);
      feasibleClusters.push(...subClusters);
    }
  }

  // Check if total constraint demands are reasonable
  const totalConstrainedPeople = feasibleClusters.reduce(
    (sum, c) => sum + c.size,
    0,
  );

  if (totalConstrainedPeople > 0) {
    console.log(
      `Processing ${feasibleClusters.length} feasible pairing constraints covering ${totalConstrainedPeople} people`,
    );
  }

  return { feasibleClusters, warnings };
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

  if (totalParticipants === 0) {
    return [];
  }

  const fullGroups = Math.floor(totalParticipants / groupSize);
  const remainder = totalParticipants % groupSize;

  let groupSizes: number[] = [];

  if (remainder === 0) {
    // Perfect division - all groups have target size
    groupSizes = Array(fullGroups).fill(groupSize);
  } else if (remainder === 1 && fullGroups >= 1) {
    // Avoid a group of 1 by taking one full group and combining with remainder
    // Then split those people into 2 groups
    const combinedPeople = groupSize + 1;
    const splitSize1 = Math.floor(combinedPeople / 2);
    const splitSize2 = Math.ceil(combinedPeople / 2);

    // (fullGroups - 1) groups of target size + 2 groups from the split
    groupSizes = [
      ...Array(fullGroups - 1).fill(groupSize),
      splitSize1,
      splitSize2,
    ];
  } else {
    // Other remainders: fullGroups of target size + 1 group with remainder
    groupSizes = [...Array(fullGroups).fill(groupSize), remainder];
  }

  // Create groups from the calculated sizes
  const groups: Group[] = [];
  let participantIndex = 0;

  for (let i = 0; i < groupSizes.length; i++) {
    const groupMembers = participants.slice(
      participantIndex,
      participantIndex + groupSizes[i],
    );

    groups.push({
      id: i + 1,
      group_number: i + 1,
      members: groupMembers,
    });

    participantIndex += groupSizes[i];
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

    // Fetch pairing preferences
    const { data: pinnedPairs, error: pairsError } = await supabase
      .from('pinned_pairs')
      .select('participant_id, pinned_participant_id')
      .eq('session_id', session.id);

    if (pairsError) {
      console.error('Error fetching pinned pairs:', pairsError);
    }

    const pairingPreferences = pinnedPairs || [];

    console.log(
      `Grouping ${participants.length} participants into groups of ${groupSize}`,
    );
    if (pairingPreferences.length > 0) {
      console.log(`Found ${pairingPreferences.length} pairing preferences`);
    }

    // Update session status to 'grouping' immediately so all users see loading screen
    const { error: statusUpdateError } = await supabase
      .from('sessions')
      .update({
        status: 'grouping',
      })
      .eq('id', session.id);

    if (statusUpdateError) {
      console.error('Error updating session status:', statusUpdateError);
      // Continue anyway, this is not critical
    }

    // Find paired clusters (people who want to be grouped together)
    const pairedClusters = findPairedClusters(participants, pairingPreferences);

    // Process clusters: split oversized ones, prioritize feasible constraints
    const { feasibleClusters, warnings } = processClusters(
      pairedClusters,
      groupSize,
      pairingPreferences,
    );

    // Log any warnings about constraint conflicts
    warnings.forEach((warning) => console.warn(warning));

    // Build a map of participant ID to their feasible cluster
    const participantToClusters = new Map<string, Set<string>>();
    feasibleClusters.forEach((cluster) => {
      cluster.forEach((participantId) => {
        participantToClusters.set(participantId, cluster);
      });
    });

    // Prepare participant data with pairing information
    const participantList = participants
      .map((p, i) => {
        const cluster = participantToClusters.get(p.id);
        let pairingInfo = '';

        if (cluster && cluster.size > 1) {
          const pairedNames = Array.from(cluster)
            .map((id) => participants.find((p) => p.id === id)?.display_name)
            .filter((name) => name !== p.display_name)
            .join(', ');
          pairingInfo = ` [Wants to be paired with: ${pairedNames}]`;
        }

        return `${i + 1}. ${p.display_name}: ${p.summary || '[No summary provided]'}${pairingInfo}`;
      })
      .join('\n');

    // Build pairing constraints for the prompt
    let pairingConstraints = '';
    if (participantToClusters.size > 0) {
      const constraintsList: string[] = [];
      const processedClusters = new Set<Set<string>>();

      participantToClusters.forEach((cluster, participantId) => {
        if (!processedClusters.has(cluster)) {
          processedClusters.add(cluster);
          const names = Array.from(cluster)
            .map((id) => participants.find((p) => p.id === id)?.display_name)
            .filter(Boolean)
            .join(', ');
          const clusterSize = cluster.size;

          // Add size information to help AI understand constraint importance
          if (clusterSize === 2) {
            constraintsList.push(
              `- PAIR (${clusterSize} people): ${names} - must be adjacent`,
            );
          } else {
            constraintsList.push(
              `- GROUP (${clusterSize} people): ${names} - must be adjacent`,
            );
          }
        }
      });

      if (constraintsList.length > 0) {
        pairingConstraints = `\n\nCRITICAL PAIRING CONSTRAINTS (these override personality matching):\n${constraintsList.join('\n')}\n\nIMPORTANT: These people have explicitly requested to be together. Place them adjacent in your sorted list (consecutively) so they end up in the same group when the list is divided into groups of ~${groupSize}. Pairing constraints are MORE important than personality similarity.`;
      }
    }

    // Ask AI to analyze and sort participants
    const sortingPrompt = `You are a group formation AI. Analyze these participants and sort them by similarity in interests, personality, and preferences. Group people who would work well together.

Participants:
${participantList}${pairingConstraints}

Task: Return ONLY a JSON array of participant indices (1-based) in the optimal order for grouping. Sort so that similar people are adjacent. CRITICAL: People with pairing constraints MUST be placed next to each other in your sorted list.

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
