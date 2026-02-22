'use client';

import JoinSessionCard from '@/components/home/JoinSessionCard';
import CreateSessionCard from '@/components/home/CreateSessionCard';
import HowItWorksSection from '@/components/home/HowItWorksSection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="pt-38 px-4">
        <div className="max-w-[1440px] mx-auto text-center">
          <h1 className="text-6xl font-semibold text-neutral-800 mb-6 animate-fade-in">
            Find Your <span className="text-primary/80">Vibe</span>
          </h1>
          <p className="text-xl text-neutral-700 mb-18 w-5/6 mx-auto">
            AI-powered group generation that matches people based on personality
            and interests. Create a session, let people join, and watch the
            magic happen.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <JoinSessionCard />
            <CreateSessionCard />
          </div>

          {/* Features Section */}
          <HowItWorksSection />
        </div>
      </div>
    </div>
  );
}
