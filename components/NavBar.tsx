'use client';

import { logo } from '@/app/assets';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NavBar = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/session/create', {
        method: 'POST',
      });

      if (response.ok) {
        const { code } = await response.json();
        router.push(`/${code}`);
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <nav className="fixed top-0 z-50 w-full bg-white px-6 py-4">
      <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between bg-white text-black">
        <Link href="/" className="flex gap-2 flex-row items-center ">
          <Image
            src={logo}
            alt="VibeCheck Logo"
            width={40}
            height={40}
            className="inline mr-2"
          />
          <h4
            className="text-primary text-[28px]"
            style={{ fontFamily: 'var(--font-anton)' }}
          >
            Vibe Check
          </h4>
        </Link>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton>
              <button className="bg-transparent text-white font-semibold px-4 py-2 rounded hover:bg-gray-800 transition hover:cursor-pointer">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="bg-violet-600 text-white font-bold px-4 py-2 rounded hover:bg-violet-700 transition hover:cursor-pointer">
                Sign Up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="bg-linear-to-r from-violet-600 to-purple-600 text-white font-bold px-6 py-2 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : '+ Create Session'}
            </button>
            <div className="[&_.cl-avatarBox]:!w-10 [&_.cl-avatarBox]:!h-10 [&_.cl-avatarImage]:!w-10 [&_.cl-avatarImage]:!h-10 [&_.cl-avatarImage]:!object-cover [&_.cl-avatarImage]:!object-center">
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Profile"
                    labelIcon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    }
                    href="/profile"
                  />
                  <UserButton.Action label="manageAccount" />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
