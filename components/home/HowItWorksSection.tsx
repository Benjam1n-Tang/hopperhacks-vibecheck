import { UserPlus, Bot, Users } from 'lucide-react';

export default function HowItWorksSection() {
  return (
    <div>
      <h3 className="text-3xl font-bold text-neutral-800 mb-8">How It Works</h3>
      <div className="grid md:grid-cols-3 gap-6 text-left">
        <div className="rounded-2xl p-8 border-2 border-neutral-200 hover:border-neutral-300 transition-all">
          <div className="mb-4">
            <UserPlus className="size-10 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-neutral-800 mb-2">
            1. Create or Join
          </h4>
          <p className="text-neutral-600">
            Host creates a session with a unique code. Participants join with
            just a name and short bio.
          </p>
        </div>
        <div className="rounded-2xl p-8 border-2 border-neutral-200 hover:border-neutral-300 transition-all">
          <div className="mb-4">
            <Bot className="size-10 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-neutral-800 mb-2">
            2. AI Analysis
          </h4>
          <p className="text-neutral-600">
            Our AI analyzes everyone's interests and personalities to find the
            best matches.
          </p>
        </div>
        <div className="rounded-2xl p-8 border-2 border-neutral-200 hover:border-neutral-300 transition-all">
          <div className="mb-4">
            <Users className="size-10 text-primary" />
          </div>
          <h4 className="text-xl font-bold text-neutral-800 mb-2">
            3. Perfect Groups
          </h4>
          <p className="text-neutral-600">
            Get instantly sorted into groups with people who vibe with you. Host
            can regenerate anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
