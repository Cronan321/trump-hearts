import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: January 1, 2025</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed">
              When you register for Trump Hearts, we collect your username, email address, and a hashed version of your password.
              During gameplay, we collect game statistics, scores, and session data to provide a seamless experience.
              We do not collect payment information directly — all transactions are handled by our trusted payment processors.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed">
              Your information is used to operate and improve the Trump Hearts platform, authenticate your account,
              display leaderboards and game history, and send you important service notifications.
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">3. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your preferences, and analyze
              platform usage. See our <Link to="/cookies" className="text-gold hover:text-gold-light underline">Cookie Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">4. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account data for as long as your account is active. You may request deletion of your account
              and associated data at any time by contacting our support team.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">5. Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords,
              and regular security audits to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">6. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For privacy-related inquiries, please visit our{' '}
              <Link to="/contact" className="text-gold hover:text-gold-light underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
