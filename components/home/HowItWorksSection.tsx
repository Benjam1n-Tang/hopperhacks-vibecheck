export default function HowItWorksSection() {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10">
      <h3 className="text-3xl font-bold text-white mb-8">How It Works</h3>
      <div className="grid md:grid-cols-3 gap-8 text-left">
        <div>
          <div className="text-4xl mb-4">🎪</div>
          <h4 className="text-xl font-bold text-white mb-2">
            1. Create or Join
          </h4>
          <p className="text-gray-300">
            Host creates a session with a unique code. Participants join with
            just a name and short bio.
          </p>
        </div>
        <div>
          <div className="text-4xl mb-4">🤖</div>
          <h4 className="text-xl font-bold text-white mb-2">2. AI Analysis</h4>
          <p className="text-gray-300">
            Our AI analyzes everyone's interests and personalities to find the
            best matches.
          </p>
        </div>
        <div>
          <div className="text-4xl mb-4">👥</div>
          <h4 className="text-xl font-bold text-white mb-2">
            3. Perfect Groups
          </h4>
          <p className="text-gray-300">
            Get instantly sorted into groups with people who vibe with you. Host
            can regenerate anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
