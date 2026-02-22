'use client';

import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  const supabase = createClient();

  // Check if current user is the host
  const isHost = isLoaded && user && user.id === hostClerkId;

  // Load saved participant info from localStorage on mount
  useEffect(() => {
    const savedInfo = localStorage.getItem(`session_${code}_info`);
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo);
        const savedName = parsedInfo.displayName || parsedInfo.display_name;
        const savedSummary = parsedInfo.summary;
        setDisplayName(savedName || '');
        setSummary(savedSummary || '');
      } catch (error) {
        console.error('Error loading saved info:', error);
      }
    }
  }, [code]);

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
        .select('id, status, host_clerk_id, groups_data')
        .eq('code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        console.error('Session not found:', sessionError);
        return;
      }

      setSessionId(session.id);
      setSessionStatus(session.status);
      setHostClerkId(session.host_clerk_id);
      setGroupsData(session.groups_data);

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
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-blue-900 to-indigo-900 pt-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Session Code Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            Session Code: <span className="text-yellow-400">{code}</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Share this code with others to join the session
          </p>
        </div>

        {/* Groups Generated - Show navigation buttons */}
        {sessionStatus === 'grouping' && groupsData && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Groups Have Been Generated!
              </h2>
              <p className="text-gray-300 mb-6">
                {isHost
                  ? 'View all the groups that were created'
                  : "Check out your group assignment and see who you're matched with"}
              </p>
              <button
                onClick={() =>
                  router.push(`/${code}/${isHost ? 'groups' : 'my-group'}`)
                }
                className="bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                {isHost ? 'View All Groups' : 'View My Group'} →
              </button>
            </div>
          </div>
        )}

        {sessionStatus !== 'grouping' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Participant Join Form - Hidden for host */}
            {!hasJoined && !isHost && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Join Session
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white mb-2 font-semibold">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-white mb-2 font-semibold">
                      About You
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 h-32 resize-none"
                      placeholder="Tell us about your interests, personality, or what you're looking for..."
                    />
                  </div>
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    className="w-full bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining ? 'Joining...' : 'Join Session'}
                  </button>
                </div>
              </div>
            )}

            {hasJoined && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h2 className="text-3xl font-bold text-white mb-6">
                  ✓ You've Joined!
                </h2>
                <p className="text-gray-200 text-lg mb-4">
                  Waiting for the host to start grouping...
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Your info is saved. If you close this tab and return, you'll
                  automatically rejoin.
                </p>
                <button
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
                  className="text-sm text-red-400 hover:text-red-300 underline"
                >
                  Leave and clear saved info
                </button>
              </div>
            )}

            {/* Participants List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6">
                Participants ({participants.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-gray-300 italic">No participants yet...</p>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-white/20 rounded-lg px-4 py-3 text-white font-semibold animate-fade-in"
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
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-t-4 border-violet-500"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse text-4xl">🎲</div>
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Generating Groups...
              </h2>
              <p className="text-gray-300 text-lg mb-2">
                Our AI is analyzing personalities and interests
              </p>
              <p className="text-gray-400 text-sm">
                This may take a few moments
              </p>
              <div className="mt-8 flex justify-center gap-2">
                <div
                  className="w-3 h-3 bg-violet-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                ></div>
                <div
                  className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Host Controls (show only to host) */}
        {isHost && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Host Controls
            </h2>

            {/* Session Status Indicator */}
            <div className="mb-4">
              <span className="text-gray-300 text-sm">Session Status: </span>
              <span
                className={`font-bold ${
                  sessionStatus === 'waiting'
                    ? 'text-green-400'
                    : sessionStatus === 'done'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
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

            <div className="flex flex-wrap gap-4">
              {/* Show Close Session when status is waiting */}
              {sessionStatus === 'waiting' && (
                <button
                  onClick={handleCloseSession}
                  className="bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-all transform hover:scale-105"
                >
                  Close Session
                </button>
              )}

              {/* Show these buttons when session is closed (done) */}
              {sessionStatus === 'done' && (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateGroups}
                      disabled={isGeneratingGroups}
                      className="bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingGroups ? 'Generating...' : 'Generate Groups'}
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="text-white text-sm font-semibold">
                        Group Size:
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="10"
                        value={groupSize}
                        onChange={(e) =>
                          setGroupSize(parseInt(e.target.value) || 3)
                        }
                        className="w-16 px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 text-center font-bold"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleResetSession}
                    className="bg-orange-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-orange-700 transition-all transform hover:scale-105"
                  >
                    Reset Session
                  </button>
                  <button
                    onClick={handleContinueSession}
                    className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105"
                  >
                    Continue Session
                  </button>
                </>
              )}

              {/* Testing Tools - Always shown to host */}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => handleSeedTestParticipants(5)}
                  disabled={isSeeding}
                  className="bg-blue-600 text-white font-semibold px-4 py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSeeding ? 'Adding...' : '+ 5 Test Users'}
                </button>
                <button
                  onClick={() => handleSeedTestParticipants(10)}
                  disabled={isSeeding}
                  className="bg-blue-600 text-white font-semibold px-4 py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSeeding ? 'Adding...' : '+ 10 Test Users'}
                </button>
                <button
                  onClick={() => handleSeedTestParticipants(20)}
                  disabled={isSeeding}
                  className="bg-blue-600 text-white font-bold px-4 py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSeeding ? 'Adding...' : '+ 20 Test Users'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
