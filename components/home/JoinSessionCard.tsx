'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinSessionCard() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSession = () => {
    if (joinCode.trim()) {
      router.push(`/${joinCode.toUpperCase()}`);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all">
      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-3xl font-bold text-white mb-4">Join Session</h2>
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
  );
}
