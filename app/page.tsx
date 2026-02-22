'use client';

import JoinSessionCard from '@/components/home/JoinSessionCard';
import CreateSessionCard from '@/components/home/CreateSessionCard';
import HowItWorksSection from '@/components/home/HowItWorksSection';

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="pt-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-7xl font-bold text-black mb-6 animate-fade-in">
            Find Your <span className="text-yellow-400">Vibe</span>
          </h1>
          <p className="text-2xl text-gray-200 mb-12 max-w-2xl mx-auto">
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
