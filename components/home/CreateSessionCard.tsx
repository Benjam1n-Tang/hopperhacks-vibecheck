'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateSessionCard() {
  const router = useRouter();

  const handleCreateSession = async () => {
    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
      });

      if (response.status === 401) {
        // Not authenticated, redirect to sign in
        router.push('/sign-in');
        return;
      }

      if (response.ok) {
        const { code } = await response.json();
        router.push(`/${code}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <div className="rounded-2xl p-8 border-2 border-neutral-200 hover:border-neutral-300 transition-all flex flex-col hover:bg-primary/5">
      <div className="mb-4">
        <Sparkles className="size-12 text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">
        Create Session
      </h2>
      <p className="text-neutral-500 mb-6">
        Start a new session and invite participants
      </p>
      <div className="flex-1 flex flex-col justify-end">
        <Button
          onClick={handleCreateSession}
          className="w-full py-6 text-base"
          size="lg"
        >
          Create Session
        </Button>
      </div>
    </div>
  );
}
