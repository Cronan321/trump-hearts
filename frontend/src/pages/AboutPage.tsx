import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">About Trump Hearts</h1>
        <p className="text-gray-400 text-sm mb-10">The premier online Hearts card game experience</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Our Story</h2>
            <p className="text-gray-300 leading-relaxed">
              Trump Hearts was born from a love of classic card games and a desire to bring the timeless game of Hearts
              into the modern era. We combined the beloved mechanics of traditional Hearts with a unique trump suit
              twist, creating a deeper, more strategic experience for card game enthusiasts worldwide.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">The Game</h2>
            <p className="text-gray-300 leading-relaxed">
              Trump Hearts is a trick-taking card game for 4 players. Like classic Hearts, the goal is to avoid
              collecting penalty cards — but with a rotating trump suit that changes every round, every game
              demands fresh strategy. Whether you're a seasoned card shark or a curious newcomer, Trump Hearts
              offers depth, excitement, and endless replayability.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Features</h2>
            <ul className="text-gray-300 space-y-2 list-none">
              {[
                '🃏 Real-time multiplayer with up to 4 players per table',
                '🏆 Global leaderboards and player rankings',
                '💬 In-game chat and quick-chat emotes',
                '🎙️ Optional voice chat for a social experience',
                '🪙 Virtual coin economy with daily rewards',
                '📊 Detailed game history and statistics',
                '🎨 Elegant gold and marble themed interface',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              We believe great card games should be accessible to everyone. Our mission is to create a fair,
              fun, and beautifully crafted platform where players of all skill levels can enjoy the art of
              Hearts. We are committed to continuous improvement based on community feedback.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Get in Touch</h2>
            <p className="text-gray-300 leading-relaxed">
              We love hearing from our players. Whether you have feedback, a bug report, or just want to say
              hello, visit our{' '}
              <Link to="/contact" className="text-gold hover:text-gold-light underline">
                Contact page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
