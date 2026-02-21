'use client';

import { useParams } from 'next/navigation';
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
  const { user, isLoaded } = useUser();
  const code = params.code as string;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [summary, setSummary] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch session and participants on mount
  useEffect(() => {
    async function fetchSessionData() {
      // Get session by code
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, status, host_clerk_id')
        .eq('code', code.toUpperCase())
        .single();

      if (sessionError || !session) {
        console.error('Session not found:', sessionError);
        return;
      }

      setSessionId(session.id);

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

  // Set up Realtime subscription for new participants
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

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

        <div className="grid md:grid-cols-2 gap-8">
          {/* Participant Join Form */}
          {!hasJoined && (
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
              <p className="text-gray-200 text-lg">
                Waiting for the host to start grouping...
              </p>
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

        {/* Host Controls (show only to host) */}
        {isLoaded && user && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Host Controls
            </h2>
            <div className="flex flex-wrap gap-4">
              <button className="bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 transition-all transform hover:scale-105">
                Generate Groups
              </button>
              <button className="bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-all transform hover:scale-105">
                Close Session
              </button>

              {/* Testing Tools */}
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
