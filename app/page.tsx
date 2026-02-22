'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSession = () => {
    if (joinCode.trim()) {
      router.push(`/${joinCode.toUpperCase()}`);
    }
  };

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
    <div className="min-h-screen bg-linear-to-br from-violet-900 via-purple-900 to-indigo-900">
      <div className="pt-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <h1 className="text-7xl font-bold text-white mb-6 animate-fade-in">
            Find Your <span className="text-yellow-400">Vibe</span>
          </h1>
          <p className="text-2xl text-gray-200 mb-12 max-w-2xl mx-auto">
            AI-powered group generation that matches people based on personality
            and interests. Create a session, let people join, and watch the
            magic happen.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Join Session Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Join Session
              </h2>
              <p className="text-gray-300 mb-6">
                Have a code? Enter it below to join an existing session
              </p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter Code"
                maxLength={6}
                className="w-full px-6 py-4 rounded-lg text-center text-2xl font-bold bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4 uppercase"
              />
              <button
                onClick={handleJoinSession}
                disabled={!joinCode.trim()}
                className="w-full bg-linear-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Join Now
              </button>
            </div>

            {/* Create Session Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all">
              <div className="text-5xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Create Session
              </h2>
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
          </div>

          {/* Features Section */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10">
            <h3 className="text-3xl font-bold text-white mb-8">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <div className="text-4xl mb-4">🎪</div>
                <h4 className="text-xl font-bold text-white mb-2">
                  1. Create or Join
                </h4>
                <p className="text-gray-300">
                  Host creates a session with a unique code. Participants join
                  with just a name and short bio.
                </p>
              </div>
              <div>
                <div className="text-4xl mb-4">🤖</div>
                <h4 className="text-xl font-bold text-white mb-2">
                  2. AI Analysis
                </h4>
                <p className="text-gray-300">
                  Our AI analyzes everyone's interests and personalities to find
                  the best matches.
                </p>
              </div>
              <div>
                <div className="text-4xl mb-4">👥</div>
                <h4 className="text-xl font-bold text-white mb-2">
                  3. Perfect Groups
                </h4>
                <p className="text-gray-300">
                  Get instantly sorted into groups with people who vibe with
                  you. Host can regenerate anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
