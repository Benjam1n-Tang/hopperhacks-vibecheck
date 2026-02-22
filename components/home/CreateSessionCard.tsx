'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function CreateSessionCard() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleCreateSession = async () => {
    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
      });

      if (response.ok) {
        const { code } = await response.json();
        router.push(`/${code}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all">
      <div className="text-5xl mb-4">✨</div>
      <h2 className="text-3xl font-bold text-white mb-4">Create Session</h2>
      <p className="text-gray-300 mb-6">
        {isSignedIn
          ? 'Start a new session and invite participants'
          : 'Sign in to host and manage your own sessions'}
      </p>
      {isSignedIn ? (
        <button
          onClick={handleCreateSession}
          className="w-full bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:scale-105 mt-18"
        >
          Create Session
        </button>
      ) : (
        <div className="text-gray-400 italic mt-18">
          Sign in using the button above to create sessions
        </div>
      )}
    </div>
  );
}
