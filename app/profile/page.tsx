'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [savedSummary, setSavedSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }

    fetchProfile();
  }, [isLoaded, user, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setSavedSummary(data.user?.saved_summary || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved_summary: savedSummary }),
      });

      if (response.ok) {
        setSaveMessage({
          type: 'success',
          text: 'Profile saved successfully!',
        });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-violet-950 via-purple-900 to-indigo-950 flex items-center justify-center pt-20">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-violet-950 via-purple-900 to-indigo-950 pt-20 px-4">
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
            <p className="text-gray-300">
              Set your default summary that will be used when joining sessions
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-200 mb-2"
            >
              Email
            </label>
            <input
              type="text"
              id="email"
              value={user?.primaryEmailAddress?.emailAddress || 'N/A'}
              disabled
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="summary"
              className="block text-sm font-medium text-gray-200 mb-2"
            >
              Default Summary
              <span className="text-gray-400 font-normal ml-2">
                (Describe your interests, background, or what you're looking
                for)
              </span>
            </label>
            <textarea
              id="summary"
              value={savedSummary}
              onChange={(e) => setSavedSummary(e.target.value)}
              placeholder="e.g., I'm a full-stack developer interested in AI and web3. Looking to collaborate on innovative projects..."
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-400 mt-2">
              This summary will automatically fill in when you join new sessions
            </p>
          </div>

          {saveMessage && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                  : 'bg-red-500/20 text-red-200 border border-red-500/30'
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 rounded-lg bg-white/10 border border-white/30 text-white font-semibold hover:bg-white/20 transition"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
