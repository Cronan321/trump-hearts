import { Link } from 'react-router-dom'

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">Terms of Use</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: January 1, 2025</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using Trump Hearts, you agree to be bound by these Terms of Use. If you do not agree,
              please do not use the platform. We reserve the right to update these terms at any time with notice
              provided via the platform.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">2. Eligibility</h2>
            <p className="text-gray-300 leading-relaxed">
              You must be at least 13 years of age to create an account. By registering, you confirm that you meet
              this requirement. Users under 18 should have parental consent before participating in any coin-based
              features.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">3. Account Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree not to
              share your account, use automated tools to play, or engage in any behavior that disrupts fair gameplay
              for other users.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">4. Virtual Currency</h2>
            <p className="text-gray-300 leading-relaxed">
              Trump Hearts uses virtual coins for gameplay. These coins have no real-world monetary value and cannot
              be exchanged for cash. Coins are non-transferable and non-refundable except as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">5. Prohibited Conduct</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree not to cheat, exploit bugs, harass other players, use offensive language in chat, or attempt
              to reverse-engineer the platform. Violations may result in account suspension or permanent ban.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              Trump Hearts is provided "as is" without warranties of any kind. We are not liable for any loss of
              virtual currency, game data, or service interruptions beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">7. Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These terms are governed by applicable law. Disputes shall be resolved through binding arbitration
              unless prohibited by local law.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
