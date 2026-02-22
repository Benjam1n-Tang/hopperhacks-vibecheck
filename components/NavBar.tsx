'use client';

import { logo } from '@/app/assets';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Menu, X } from 'lucide-react';
import { Button } from './ui/button';

const NavBar = () => {
  const router = useRouter();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <nav className="fixed top-0 z-50 w-full bg-white px-6 py-4 border-b border-neutral-300">
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center">
          <SignedOut>
            <div className="flex items-center gap-4">
              <SignInButton>
                <Button
                  variant="ghost"
                  className="font-semibold py-6 px-9 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button className="font-semibold py-6 px-9 rounded-xl">
                  Sign Up
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-6">
              <Button
                onClick={handleCreateSession}
                disabled={isCreating}
                className="font-semibold py-6 pl-4! pr-5! rounded-xl px-!8"
              >
                {isCreating ? (
                  'Creating...'
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-1" />
                    Create Session
                  </>
                )}
              </Button>
              <div className="[&_.cl-avatarBox]:w-10! [&_.cl-avatarBox]:h-10! [&_.cl-avatarImage]:w-10! [&_.cl-avatarImage]:h-10! [&_.cl-avatarImage]:object-cover! [&_.cl-avatarImage]:object-center!">
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
            </div>
          </SignedIn>
        </div>

        {/* Mobile Hamburger Menu */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-12 w-12"
          >
            {mobileMenuOpen ? (
              <X className="h-9 w-9" />
            ) : (
              <Menu className="h-9 w-9" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-neutral-300 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-3">
            <SignedOut>
              <SignInButton>
                <Button
                  variant="ghost"
                  className="w-full justify-start font-semibold py-6 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button className="w-full justify-start font-semibold py-6 rounded-xl">
                  Sign Up
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-neutral-200">
                <div className="[&_.cl-avatarBox]:w-10! [&_.cl-avatarBox]:h-10! [&_.cl-avatarImage]:w-10! [&_.cl-avatarImage]:h-10!">
                  <UserButton>
                    <UserButton.MenuItems>
                      <UserButton.Action label="manageAccount" />
                    </UserButton.MenuItems>
                  </UserButton>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-neutral-800">
                    {user?.fullName || user?.firstName || 'User'}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  handleCreateSession();
                  setMobileMenuOpen(false);
                }}
                disabled={isCreating}
                className="w-full justify-start font-semibold py-6 rounded-xl"
              >
                {isCreating ? (
                  'Creating...'
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start font-semibold py-6 bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                >
                  Profile
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
