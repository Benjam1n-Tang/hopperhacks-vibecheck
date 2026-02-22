'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Users2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function JoinSessionCard() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Clear error when clicking outside the card
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setError('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleJoinSession = async () => {
    if (!joinCode.trim()) return;

    setError('');
    setIsValidating(true);

    try {
      const response = await fetch('/api/session/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: joinCode.toUpperCase() }),
      });

      if (response.ok) {
        router.push(`/${joinCode.toUpperCase()}`);
      } else {
        setError('Session not found. Please check the code and try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className="rounded-2xl p-8 border-2 border-neutral-200 hover:border-neutral-300 transition-all flex flex-col hover:bg-primary/5"
    >
      <div className="mb-4">
        <Users2 className="size-12 text-primary" />
      </div>
      <h2 className="text-3xl font-bold text-neutral-800 mb-4">Join Session</h2>
      <p className="text-neutral-500 mb-6">
        Have a code? Enter it below to join an existing session
      </p>
      <div className="flex-1 flex flex-col justify-end">
        <Input
          type="text"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(e.target.value.toUpperCase());
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && joinCode.trim() && !isValidating) {
              handleJoinSession();
            }
          }}
          placeholder="Enter Code"
          maxLength={6}
          className="w-full px-6 py-6! text-center text-2xl font-bold mb-2 uppercase"
        />
        {error && (
          <p className="text-sm text-destructive mb-3 text-center">{error}</p>
        )}
        <Button
          onClick={handleJoinSession}
          disabled={!joinCode.trim() || isValidating}
          className="w-full py-6 text-base"
          size="lg"
        >
          {isValidating ? 'Validating...' : 'Join Now'}
        </Button>
      </div>
    </div>
  );
}
