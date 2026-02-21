import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import Link from 'next/link';

const NavBar = () => {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-gray-900 text-white shadow-md">
      <Link
        href="/"
        className="font-bold text-2xl hover:text-violet-400 transition"
      >
        VibeCheck
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
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
};

export default NavBar;
