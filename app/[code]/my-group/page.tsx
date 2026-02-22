'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lightbulb } from 'lucide-react';

interface Participant {
  id: string;
  display_name: string;
  summary: string | null;
}

interface Group {
  id: string;
  group_number: number;
  members: Participant[];
  explanation: string;
}

export default function MyGroupPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('Untitled Session');
  const supabase = createClient();

  useEffect(() => {
    loadSessionAndParticipant();
  }, [code]);

  useEffect(() => {
    if (sessionId && myParticipantId) {
      loadMyGroup();

      // Subscribe to group changes
      const groupChannel = supabase
        .channel(`my-group-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`,
          },
          () => {
            loadMyGroup();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(groupChannel);
      };
    }
  }, [sessionId, myParticipantId]);

  const loadSessionAndParticipant = async () => {
    // Load session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, groups_data, title')
      .eq('code', code)
      .single();

    if (sessionError || !session) {
      console.error('Error loading session:', sessionError);
      router.push('/');
      return;
    }

    if (session.status !== 'grouping') {
      // Redirect back to main session page if groups haven't been generated yet
      router.push(`/${code}`);
      return;
    }

    setSessionId(session.id);
    setSessionTitle(session.title || 'Untitled Session');

    // Get participant info from localStorage
    const storageKey = `session_${code}_info`;
    const savedInfo = localStorage.getItem(storageKey);

    if (!savedInfo) {
      // No saved info, redirect to main page to join
      router.push(`/${code}`);
      return;
    }

    const parsedInfo = JSON.parse(savedInfo);
    const display_name = parsedInfo.display_name || parsedInfo.displayName;

    if (!display_name) {
      console.error('No display name found in localStorage');
      router.push(`/${code}`);
      return;
    }

    // Find participant ID by display name
    const { data: participants, error: participantError } = await supabase
      .from('participants')
      .select('id, display_name')
      .eq('session_id', session.id)
      .eq('display_name', display_name);

    if (participantError) {
      console.error('Error finding participant:', participantError);
      router.push(`/${code}`);
      return;
    }

    if (!participants || participants.length === 0) {
      console.error('No participant found with display name:', display_name);
      console.log(
        'Available participants:',
        await supabase
          .from('participants')
          .select('display_name')
          .eq('session_id', session.id),
      );
      router.push(`/${code}`);
      return;
    }

    const participant = participants[0];
    setMyParticipantId(participant.id);

    // Find and load the group this participant is in
    if (session.groups_data) {
      const myGroup = session.groups_data.find((group: any) =>
        group.members.some((member: any) => member.id === participant.id),
      );
      if (myGroup) {
        setMyGroup(myGroup);
      }
    }
    setLoading(false);
  };

  const loadMyGroup = async () => {
    if (!sessionId || !myParticipantId) return;

    // Fetch groups from sessions.groups_data JSON column
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('groups_data, title')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error loading groups:', sessionError);
      setLoading(false);
      return;
    }

    // Update title if it changed
    if (session?.title) {
      setSessionTitle(session.title);
    }

    // Find which group this participant is in
    if (session?.groups_data) {
      const myGroup = session.groups_data.find((group: any) =>
        group.members.some((member: any) => member.id === myParticipantId),
      );
      if (myGroup) {
        setMyGroup(myGroup);
      }
    }
    setLoading(false);
  };

  const handleBackToSession = () => {
    router.push(`/${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your group...</p>
        </div>
      </div>
    );
  }

  if (!myGroup) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pb-12">
        <div className="text-center">
          <p className="text-neutral-600 text-lg mb-4">
            You haven't been assigned to a group yet.
          </p>
          <Button
            onClick={handleBackToSession}
            size="lg"
            className="font-semibold"
          >
            Back to Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 px-4 pb-12">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-8">
          <Button
            onClick={handleBackToSession}
            variant="outline"
            size="lg"
            className="font-semibold mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Session
          </Button>
          <h1 className="text-5xl font-bold text-neutral-800 mb-2">
            {sessionTitle}
          </h1>
          <p className="text-neutral-600 text-lg">
            Session Code:{' '}
            <span className="font-semibold text-primary">{code}</span> • You're
            in{' '}
            <span className="font-semibold text-primary">
              Group {myGroup.group_number}
            </span>
          </p>
        </div>

        <div className="rounded-2xl p-8 border-2 border-neutral-200 bg-white mb-6">
          <h2 className="text-2xl font-bold text-primary mb-6">
            Group {myGroup.group_number} Members
          </h2>
          <div className="space-y-4">
            {myGroup.members.map((member) => (
              <div
                key={member.id}
                className={`rounded-lg p-4 border-2 transition ${
                  member.id === myParticipantId
                    ? 'border-primary bg-primary/5'
                    : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-neutral-800 text-lg">
                    {member.display_name}
                  </div>
                  {member.id === myParticipantId && (
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </div>
                {member.summary && (
                  <div className="text-sm text-neutral-600 mt-2">
                    {member.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-8 border-2 border-primary/20 bg-primary/5 pb-12">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-primary rounded-full p-2 mt-1">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-800 mb-2">
                Why were you grouped together?
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                {myGroup.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
