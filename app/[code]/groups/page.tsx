'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw } from 'lucide-react';

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

export default function GroupsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const code = params.code as string;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>('Untitled Session');
  const supabase = createClient();

  useEffect(() => {
    loadSession();
  }, [code, user]);

  useEffect(() => {
    if (sessionId) {
      loadGroups();

      // Subscribe to group changes
      const groupChannel = supabase
        .channel(`groups-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`,
          },
          () => {
            loadGroups();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(groupChannel);
      };
    }
  }, [sessionId]);

  const loadSession = async () => {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, host_clerk_id, status, groups_data, title')
      .eq('code', code)
      .single();

    if (error || !session) {
      console.error('Error loading session:', error);
      router.push('/');
      return;
    }

    setSessionId(session.id);
    setSessionTitle(session.title || 'Untitled Session');

    // Check if current user is the host
    if (user && session.host_clerk_id === user.id) {
      setIsHost(true);
      // Load groups from session data
      if (session.groups_data) {
        setGroups(session.groups_data);
        setLoading(false);
      }
    } else {
      // Participants should go to their group page
      router.push(`/${code}/my-group`);
    }
  };

  const loadGroups = async () => {
    if (!sessionId) return;

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

    if (session?.groups_data) {
      setGroups(session.groups_data);
    }
    if (session?.title) {
      setSessionTitle(session.title);
    }
    setLoading(false);
  };

  const handleBackToSession = () => {
    router.push(`/${code}`);
  };

  const handleResetSession = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset this session? This will delete all groups and reopen the session for new participants.',
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        router.push(`/${code}`);
      } else {
        console.error('Failed to reset session');
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (!isHost) {
    return null; // Redirected to my-group page
  }

  return (
    <div className="min-h-screen bg-white pt-32 px-4 pb-12">
      <div className="max-w-360 mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-5xl font-bold text-neutral-800 mb-2">
              {sessionTitle}
            </h1>
            <p className="text-neutral-600 text-lg">
              Session Code:{' '}
              <span className="font-semibold text-primary">{code}</span> •{' '}
              {groups.length} {groups.length === 1 ? 'group' : 'groups'} formed
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleBackToSession}
              variant="outline"
              size="lg"
              className="font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Session
            </Button>
            <Button
              onClick={handleResetSession}
              variant="destructive"
              size="lg"
              className="font-semibold"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Session
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-lg">
              No groups have been generated yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-300 transition-all bg-white"
              >
                <h2 className="text-2xl font-bold text-primary mb-4">
                  Group {group.group_number}
                </h2>
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-neutral-50 rounded-lg p-3 border border-neutral-200"
                    >
                      <div className="font-semibold text-neutral-800">
                        {member.display_name}
                      </div>
                      {member.summary && (
                        <div className="text-sm text-neutral-600 mt-1 line-clamp-2">
                          {member.summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="text-sm text-neutral-500">
                    {group.members.length}{' '}
                    {group.members.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
