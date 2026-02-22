'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X } from 'lucide-react';

interface Participant {
  id: string;
  display_name: string;
  summary: string;
  joined_at: string;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const code = params.code as string;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [summary, setSummary] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [hostClerkId, setHostClerkId] = useState<string | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [groupSize, setGroupSize] = useState<number>(3);
  const [isGeneratingGroups, setIsGeneratingGroups] = useState(false);
  const [groupsData, setGroupsData] = useState<any>(null);
  const [selectedPairings, setSelectedPairings] = useState<string[]>([]);
  const [pairingWarning, setPairingWarning] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('Untitled Session');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const supabase = createClient();

  // Check if current user is the host
  const isHost = isLoaded && user && user.id === hostClerkId;

  // Calculate cluster size accounting for transitive relationships
  const calculateClusterSize = (
    participantId: string,
    selectedIds: string[],
  ): number => {
    // Build a graph of all pairing relationships
    const graph = new Map<string, Set<string>>();

    // Add current selection
    const allIds = [participantId, ...selectedIds];
    allIds.forEach((id) => {
      if (!graph.has(id)) graph.set(id, new Set());
    });
    selectedIds.forEach((id) => {
      graph.get(participantId)!.add(id);
      graph.get(id)!.add(participantId);
    });

    // DFS to find connected component size
    const visited = new Set<string>();
    const dfs = (id: string): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      let count = 1;
      (graph.get(id) || new Set()).forEach((neighborId) => {
        count += dfs(neighborId);
      });
      return count;
    };

    return dfs(participantId);
  };

  // Load saved participant info from localStorage and user profile on mount
  useEffect(() => {
    async function loadSavedInfo() {
      // First try to load from localStorage (session-specific)
      const savedInfo = localStorage.getItem(`session_${code}_info`);
      if (savedInfo) {
        try {
          const parsedInfo = JSON.parse(savedInfo);
          const savedName = parsedInfo.displayName || parsedInfo.display_name;
          const savedSummary = parsedInfo.summary;
          setDisplayName(savedName || '');
          setSummary(savedSummary || '');
          return; // If we have session-specific info, use it
        } catch (error) {
          console.error('Error loading saved info:', error);
        }
      }

      // If no session-specific info and user is logged in, load from profile
      if (isLoaded && user) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            if (data.user?.saved_summary) {
              setSummary(data.user.saved_summary);
            }
            // Try to use Clerk's display name if available
            if (user.fullName) {
              setDisplayName(user.fullName);
            } else if (user.firstName) {
              setDisplayName(user.firstName);
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    }

    loadSavedInfo();
  }, [code, isLoaded, user]);

  // Load pairing preferences for this participant
  useEffect(() => {
    async function loadPairingPreferences() {
      if (!myParticipantId) return;

      try {
        const response = await fetch(
          `/api/session/pair-preferences?sessionCode=${code.toUpperCase()}`,
        );
        if (response.ok) {
          const data = await response.json();
          const myPairs = data.pairs
            .filter((p: any) => p.participant_id === myParticipantId)
            .map((p: any) => p.pinned_participant_id);
          setSelectedPairings(myPairs);
        }
      } catch (error) {
        console.error('Error loading pairing preferences:', error);
      }
    }

    loadPairingPreferences();
  }, [myParticipantId, code]);

  // Auto-rejoin if user had previously joined this session
  useEffect(() => {
    async function autoRejoin() {
      if (!sessionId || isHost || hasJoined) return;

      const savedInfo = localStorage.getItem(`session_${code}_info`);
      if (!savedInfo) return;

      try {
        const parsedInfo = JSON.parse(savedInfo);
        const savedName = parsedInfo.displayName || parsedInfo.display_name;
        const savedSummary = parsedInfo.summary;
        const participantId = parsedInfo.participantId;

        // Check if this participant still exists in the session
        const { data: existingParticipant } = await supabase
          .from('participants')
          .select('id')
          .eq('id', participantId)
          .single();

        // If participant doesn't exist, automatically rejoin
        if (!existingParticipant && savedName && savedSummary) {
          console.log('Auto-rejoining session with saved info...');
          setIsJoining(true);

          const response = await fetch('/api/session/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionCode: code.toUpperCase(),
              displayName: savedName,
              summary: savedSummary,
              clerkId: user?.id || null,
            }),
          });

          if (response.ok) {
            setHasJoined(true);
            const data = await response.json();
            const newParticipantId = data.participant?.id;

            if (newParticipantId) {
              setMyParticipantId(newParticipantId);
              // Update localStorage with new participant ID
              localStorage.setItem(
                `session_${code}_info`,
                JSON.stringify({
                  display_name: savedName,
                  displayName: savedName,
                  summary: savedSummary,
                  participantId: newParticipantId,
                }),
              );
            }
          }
          setIsJoining(false);
        } else if (existingParticipant) {
          // Participant still exists, just mark as joined and track their ID
          setHasJoined(true);
          setMyParticipantId(participantId);
        }
      } catch (error) {
        console.error('Error auto-rejoining:', error);
        setIsJoining(false);
      }
    }

    autoRejoin();
  }, [sessionId, isHost, code, hasJoined, user]);

  // Fetch session and participants on mount
  useEffect(() => {
    async function fetchSessionData() {
      // Get session by code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, status, host_clerk_id, groups_data, title')
        .eq('code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        console.error('Session not found:', sessionError);
        // Redirect to home page if session doesn't exist
        router.push('/');
        return;
      }

      setSessionId(session.id);
      setSessionStatus(session.status);
      setHostClerkId(session.host_clerk_id);
      setGroupsData(session.groups_data);
      setSessionTitle(session.title || 'Untitled Session');

      // Fetch existing participants
      const { data: existingParticipants, error: participantsError } =
        await supabase
          .from('participants')
          .select('*')
          .eq('session_id', session.id)
          .order('joined_at', { ascending: true });

      if (!participantsError && existingParticipants) {
        setParticipants(existingParticipants);
      }
    }

    fetchSessionData();
  }, [code]);

  // Set up Realtime subscription for new participants and presence tracking
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New participant joined:', payload.new);
          setParticipants((prev) => [...prev, payload.new as Participant]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session updated:', payload.new);
          const newSession = payload.new as any;
          setSessionStatus(newSession.status);
          if (newSession.groups_data) {
            setGroupsData(newSession.groups_data);
          }
          if (newSession.title) {
            setSessionTitle(newSession.title);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Participant removed:', payload.old);
          setParticipants((prev) =>
            prev.filter((p) => p.id !== (payload.old as any).id),
          );
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        // When a user disconnects, remove their participant record
        leftPresences.forEach(async (presence: any) => {
          const participantId = presence.participant_id;
          if (participantId) {
            console.log(
              'User disconnected, removing participant:',
              participantId,
            );
            try {
              await fetch('/api/session/remove-participant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId }),
              });
            } catch (error) {
              console.error('Error removing participant on disconnect:', error);
            }
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && myParticipantId) {
          // Track this user's presence with their participant ID
          await channel.track({
            participant_id: myParticipantId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myParticipantId]);

  const handleJoin = async () => {
    if (!displayName.trim() || !summary.trim()) return;

    setIsJoining(true);
    try {
      const response = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          displayName,
          summary,
          clerkId: user?.id || null,
        }),
      });

      if (response.ok) {
        setHasJoined(true);
        const data = await response.json();
        const participantId = data.participant?.id;

        // Save participant info to localStorage (only for real users, not test users)
        if (participantId && !displayName.startsWith('Generated')) {
          setMyParticipantId(participantId);
          localStorage.setItem(
            `session_${code}_info`,
            JSON.stringify({
              display_name: displayName,
              displayName: displayName,
              summary,
              participantId,
            }),
          );

          // Save pairing preferences if any selected
          if (selectedPairings.length > 0) {
            await savePairingPreferences(participantId, selectedPairings);
          }

          // Save summary to user profile if logged in and they don't have one saved
          if (user) {
            try {
              const profileResponse = await fetch('/api/user/profile');
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                // Only save if user doesn't have a saved summary yet
                if (!profileData.user?.saved_summary) {
                  await fetch('/api/user/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saved_summary: summary }),
                  });
                }
              }
            } catch (error) {
              console.error('Error saving summary to profile:', error);
              // Don't fail the join if profile save fails
            }
          }
        }
      } else {
        const error = await response.json();
        console.error('Failed to join:', error);
        alert('Failed to join session. Please try again.');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const savePairingPreferences = async (
    participantId: string,
    pinnedIds: string[],
  ) => {
    try {
      await fetch('/api/session/pair-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          participantId,
          pinnedParticipantIds: pinnedIds,
        }),
      });
    } catch (error) {
      console.error('Error saving pairing preferences:', error);
    }
  };

  const handleSeedTestParticipants = async (count: number = 10) => {
    setIsSeeding(true);
    try {
      const response = await fetch('/api/session/seed-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          count,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Added ${data.participants.length} test participants`);
      } else {
        const error = await response.json();
        console.error('Failed to seed participants:', error);
        alert('Failed to add test participants.');
      }
    } catch (error) {
      console.error('Error seeding participants:', error);
      alert('An error occurred while adding test participants.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleEditTitle = () => {
    setEditTitleValue(sessionTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!editTitleValue.trim()) {
      alert('Title cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/session/update-title', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          title: editTitleValue.trim(),
        }),
      });

      if (response.ok) {
        setSessionTitle(editTitleValue.trim());
        setIsEditingTitle(false);
      } else {
        const error = await response.json();
        console.error('Failed to update title:', error);
        alert('Failed to update title.');
      }
    } catch (error) {
      console.error('Error updating title:', error);
      alert('An error occurred while updating the title.');
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditTitleValue('');
  };

  const handleCloseSession = async () => {
    try {
      const response = await fetch('/api/session/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          status: 'done',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to close session:', error);
        alert('Failed to close session.');
      }
    } catch (error) {
      console.error('Error closing session:', error);
      alert('An error occurred while closing the session.');
    }
  };

  const handleContinueSession = async () => {
    try {
      const response = await fetch('/api/session/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          status: 'waiting',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to continue session:', error);
        alert('Failed to continue session.');
      }
    } catch (error) {
      console.error('Error continuing session:', error);
      alert('An error occurred while continuing the session.');
    }
  };

  const handleResetSession = async () => {
    if (
      !confirm(
        'Are you sure you want to reset? This will remove all participants.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
        }),
      });

      if (response.ok) {
        setParticipants([]);
        setSessionStatus('waiting');
      } else {
        const error = await response.json();
        console.error('Failed to reset session:', error);
        alert('Failed to reset session.');
      }
    } catch (error) {
      console.error('Error resetting session:', error);
      alert('An error occurred while resetting the session.');
    }
  };

  const handleGenerateGroups = async () => {
    if (participants.length === 0) {
      alert('No participants to group!');
      return;
    }

    setIsGeneratingGroups(true);
    try {
      const response = await fetch('/api/session/generate-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: code.toUpperCase(),
          groupSize,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Groups generated:', data);
        // Redirect host to groups page
        router.push(`/${code}/groups`);
      } else {
        const error = await response.json();
        console.error('Failed to generate groups:', error);
        alert('Failed to generate groups: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating groups:', error);
      alert('An error occurred while generating groups.');
    } finally {
      setIsGeneratingGroups(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 px-4">
      <div className="max-w-[1440px] mx-auto">
        {/* Session Title and Code Header */}
        <div className="text-center mb-12">
          {/* Session Title */}
          <div className="mb-6">
            {isEditingTitle ? (
              <div className="flex items-center justify-center gap-3">
                <Input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  className="px-4 py-8 text-4xl font-bold text-center max-w-2xl"
                  placeholder="Enter session title"
                  autoFocus
                />
                <Button onClick={handleSaveTitle} size="lg" className="px-6">
                  <Check className="w-5 h-5 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={handleCancelEditTitle}
                  variant="destructive"
                  size="lg"
                  className="px-6"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-6xl font-bold text-neutral-800">
                  {sessionTitle}
                </h1>
                {isHost && (
                  <Button
                    onClick={handleEditTitle}
                    variant="ghost"
                    size="icon"
                    title="Edit session title"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Session Code */}
          <h2 className="text-3xl font-bold text-neutral-800 mb-4">
            Session Code: <span className="text-primary">{code}</span>
          </h2>
          <p className="text-neutral-600 text-lg">
            Share this code with others to join the session
          </p>
        </div>

        {/* Groups Generated - Show navigation buttons */}
        {sessionStatus === 'grouping' && groupsData && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="rounded-2xl p-8 border-2 border-neutral-200 text-center bg-white">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-4">
                Groups Have Been Generated!
              </h2>
              <p className="text-neutral-600 mb-6">
                {isHost
                  ? 'View all the groups that were created'
                  : "Check out your group assignment and see who you're matched with"}
              </p>
              <Button
                onClick={() =>
                  router.push(`/${code}/${isHost ? 'groups' : 'my-group'}`)
                }
                size="lg"
                className="font-bold px-8"
              >
                {isHost ? 'View All Groups' : 'View My Group'} →
              </Button>
            </div>
          </div>
        )}

        {sessionStatus !== 'grouping' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Host Controls (show only to host on the left) */}
            {isHost && (
              <div className="rounded-2xl p-8 border-2 border-neutral-200 flex flex-col">
                <h2 className="text-3xl font-bold text-neutral-800 mb-6">
                  Host Controls
                </h2>

                {/* Session Status Indicator */}
                <div className="mb-6">
                  <span className="text-neutral-600 text-sm">
                    Session Status:{' '}
                  </span>
                  <span
                    className={`font-bold ${
                      sessionStatus === 'waiting'
                        ? 'text-green-600'
                        : sessionStatus === 'done'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                    }`}
                  >
                    {sessionStatus === 'waiting'
                      ? 'Open'
                      : sessionStatus === 'done'
                        ? 'Closed'
                        : sessionStatus.charAt(0).toUpperCase() +
                          sessionStatus.slice(1)}
                  </span>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  {/* Show Close Session when status is waiting */}
                  {sessionStatus === 'waiting' && (
                    <Button
                      onClick={handleCloseSession}
                      variant="destructive"
                      size="lg"
                      className="font-semibold w-full"
                    >
                      Close Session
                    </Button>
                  )}

                  {/* Show these buttons when session is closed (done) */}
                  {sessionStatus === 'done' && (
                    <>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <label className="text-neutral-800 text-sm font-semibold whitespace-nowrap">
                            Group Size:
                          </label>
                          <Input
                            type="number"
                            min="2"
                            max="10"
                            value={groupSize}
                            onChange={(e) =>
                              setGroupSize(parseInt(e.target.value) || 3)
                            }
                            className="w-20 text-center font-bold"
                          />
                        </div>
                        <Button
                          onClick={handleGenerateGroups}
                          disabled={isGeneratingGroups}
                          size="lg"
                          className="font-semibold bg-green-600 hover:bg-green-700 w-full"
                        >
                          {isGeneratingGroups
                            ? 'Generating...'
                            : 'Generate Groups'}
                        </Button>
                      </div>
                      <Button
                        onClick={handleResetSession}
                        size="lg"
                        className="font-semibold bg-orange-600 hover:bg-orange-700 w-full"
                      >
                        Reset Session
                      </Button>
                      <Button
                        onClick={handleContinueSession}
                        size="lg"
                        className="font-semibold bg-blue-600 hover:bg-blue-700 w-full"
                      >
                        Continue Session
                      </Button>
                    </>
                  )}

                  {/* Testing Tools - Always shown to host */}
                  <div className="mt-auto pt-6 border-t border-neutral-200">
                    <p className="text-neutral-500 text-xs mb-3">
                      Testing Tools:
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleSeedTestParticipants(5)}
                        disabled={isSeeding}
                        size="sm"
                        variant="outline"
                        className="font-semibold w-full"
                      >
                        {isSeeding ? 'Adding...' : '+ 5 Test Users'}
                      </Button>
                      <Button
                        onClick={() => handleSeedTestParticipants(10)}
                        disabled={isSeeding}
                        size="sm"
                        variant="outline"
                        className="font-semibold w-full"
                      >
                        {isSeeding ? 'Adding...' : '+ 10 Test Users'}
                      </Button>
                      <Button
                        onClick={() => handleSeedTestParticipants(20)}
                        disabled={isSeeding}
                        size="sm"
                        variant="outline"
                        className="font-bold w-full"
                      >
                        {isSeeding ? 'Adding...' : '+ 20 Test Users'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Participant Join Form - Hidden for host */}
            {!hasJoined && !isHost && (
              <div className="rounded-2xl p-8 border-2 border-neutral-200">
                <h2 className="text-3xl font-bold text-neutral-800 mb-6">
                  Join Session
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-neutral-800 mb-2 font-semibold">
                      Display Name
                    </label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-800 mb-2 font-semibold">
                      About You
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium"
                      placeholder="Tell us about your interests, personality, or what you're looking for..."
                    />
                  </div>
                  {participants.length > 0 && (
                    <div>
                      <label className="block text-neutral-800 mb-2 font-semibold">
                        Want to pair with someone? (Optional)
                      </label>
                      <p className="text-neutral-600 text-sm mb-2">
                        Select people you'd like to be grouped with. The AI will
                        try to keep you together!
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                        {participants
                          .filter((p) => p.display_name !== displayName)
                          .map((participant) => (
                            <label
                              key={participant.id}
                              className="flex items-center gap-3 text-neutral-800 hover:bg-neutral-100 p-2 rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPairings.includes(
                                  participant.id,
                                )}
                                onChange={(e) => {
                                  const newPairings = e.target.checked
                                    ? [...selectedPairings, participant.id]
                                    : selectedPairings.filter(
                                        (id) => id !== participant.id,
                                      );
                                  setSelectedPairings(newPairings);

                                  // Check cluster size and show warning
                                  if (myParticipantId) {
                                    const clusterSize = calculateClusterSize(
                                      myParticipantId,
                                      newPairings,
                                    );
                                    if (clusterSize > groupSize) {
                                      setPairingWarning(
                                        `Your pairing group (${clusterSize} people) exceeds the group size (${groupSize}). You may be split into separate groups.`,
                                      );
                                    } else {
                                      setPairingWarning(null);
                                    }
                                  }
                                }}
                                className="w-4 h-4 accent-primary"
                              />
                              <span className="text-sm">
                                {participant.display_name}
                              </span>
                            </label>
                          ))}
                      </div>
                      {pairingWarning && (
                        <p className="text-yellow-600 text-xs mt-2 flex items-start gap-1">
                          <span>⚠️</span>
                          <span>{pairingWarning}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleJoin}
                    disabled={isJoining}
                    size="lg"
                    className="w-full font-bold"
                  >
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </Button>
                </div>
              </div>
            )}

            {hasJoined && (
              <div className="rounded-2xl p-8 border-2 border-neutral-200">
                <h2 className="text-3xl font-bold text-neutral-800 mb-6">
                  ✓ You've Joined!
                </h2>
                <p className="text-neutral-600 text-lg mb-4">
                  Waiting for the host to start grouping...
                </p>
                <p className="text-neutral-500 text-sm mb-4">
                  Your info is saved. If you close this tab and return, you'll
                  automatically rejoin.
                </p>

                {/* Pairing preferences for already joined participants */}
                {participants.length > 1 && (
                  <div className="mb-6">
                    <label className="block text-neutral-800 mb-2 font-semibold">
                      Want to pair with someone?
                    </label>
                    <p className="text-neutral-600 text-sm mb-3">
                      Select people you'd like to be grouped with:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                      {participants
                        .filter((p) => p.id !== myParticipantId)
                        .map((participant) => (
                          <label
                            key={participant.id}
                            className="flex items-center gap-3 text-neutral-800 hover:bg-neutral-100 p-2 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPairings.includes(
                                participant.id,
                              )}
                              onChange={async (e) => {
                                const newPairings = e.target.checked
                                  ? [...selectedPairings, participant.id]
                                  : selectedPairings.filter(
                                      (id) => id !== participant.id,
                                    );
                                setSelectedPairings(newPairings);

                                // Check cluster size and show warning
                                if (myParticipantId) {
                                  const clusterSize = calculateClusterSize(
                                    myParticipantId,
                                    newPairings,
                                  );
                                  if (clusterSize > groupSize) {
                                    setPairingWarning(
                                      `Your pairing group (${clusterSize} people) exceeds the group size (${groupSize}). You may be split into separate groups.`,
                                    );
                                  } else {
                                    setPairingWarning(null);
                                  }

                                  // Save immediately when changed
                                  await savePairingPreferences(
                                    myParticipantId,
                                    newPairings,
                                  );
                                }
                              }}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm">
                              {participant.display_name}
                            </span>
                          </label>
                        ))}
                    </div>
                    {pairingWarning && (
                      <p className="text-yellow-600 text-xs mt-2 flex items-start gap-1">
                        <span>⚠️</span>
                        <span>{pairingWarning}</span>
                      </p>
                    )}
                    {selectedPairings.length > 0 && !pairingWarning && (
                      <p className="text-green-600 text-xs mt-2">
                        ✓ Preferences saved! The AI will try to group you
                        together.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => {
                    localStorage.removeItem(`session_${code}_info`);
                    setHasJoined(false);
                    setMyParticipantId(null);
                    setDisplayName('');
                    setSummary('');
                    // Remove from participants
                    if (myParticipantId) {
                      fetch('/api/session/remove-participant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          participantId: myParticipantId,
                        }),
                      });
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Leave and clear saved info
                </Button>
              </div>
            )}

            {/* Participants List */}
            <div className="rounded-2xl p-8 border-2 border-neutral-200">
              <h2 className="text-3xl font-bold text-neutral-800 mb-6">
                Participants ({participants.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-neutral-500 italic">
                    No participants yet...
                  </p>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-neutral-100 rounded-lg px-4 py-3 text-neutral-800 font-semibold animate-fade-in hover:bg-neutral-200 transition-colors"
                    >
                      {participant.display_name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading screen for all users during group generation */}
        {sessionStatus === 'grouping' && !groupsData && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl p-12 border-2 border-neutral-200 text-center bg-white">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-t-4 border-primary"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse text-4xl">🎲</div>
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-neutral-800 mb-4">
                Generating Groups...
              </h2>
              <p className="text-neutral-600 text-lg mb-2">
                Our AI is analyzing personalities and interests
              </p>
              <p className="text-neutral-500 text-sm">
                This may take a few moments
              </p>
              <div className="mt-8 flex justify-center gap-2">
                <div
                  className="w-3 h-3 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-3 h-3 bg-primary/80 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-3 h-3 bg-primary/60 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
