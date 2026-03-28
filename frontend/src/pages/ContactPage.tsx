import { Link } from 'react-router-dom'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">Contact & Support</h1>
        <p className="text-gray-400 text-sm mb-10">We're here to help — reach out any time.</p>

        <div className="grid gap-6 md:grid-cols-2 mb-10">
          <div className="border border-gold/30 rounded-lg p-5 bg-marble-light">
            <h2 className="text-gold-light font-display font-semibold text-lg mb-2">🐛 Bug Reports</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Found something broken? Let us know and we'll get it fixed fast. Please include your username,
              the table ID if applicable, and a description of what happened.
            </p>
            <p className="text-gold text-sm mt-3">support@cronantech.com</p>
          </div>

          <div className="border border-gold/30 rounded-lg p-5 bg-marble-light">
            <h2 className="text-gold-light font-display font-semibold text-lg mb-2">⚖️ Fair Play Reports</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Encountered a cheater or disruptive player? Report them here. All reports are reviewed by our
              moderation team within 24 hours.
            </p>
            <p className="text-gold text-sm mt-3">fairplay@cronantech.com</p>
          </div>

          <div className="border border-gold/30 rounded-lg p-5 bg-marble-light">
            <h2 className="text-gold-light font-display font-semibold text-lg mb-2">💰 Billing & Coins</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Questions about your coin balance, purchases, or refunds? Our billing team is available
              Monday–Friday, 9am–5pm EST.
            </p>
            <p className="text-gold text-sm mt-3">billing@cronantech.com</p>
          </div>

          <div className="border border-gold/30 rounded-lg p-5 bg-marble-light">
            <h2 className="text-gold-light font-display font-semibold text-lg mb-2">💡 Feedback & Ideas</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Have a feature idea or general feedback? We read every message and use your input to shape
              the future of Trump Hearts.
            </p>
            <p className="text-gold text-sm mt-3">feedback@cronantech.com</p>
          </div>
        </div>

        <div className="border border-gold/30 rounded-lg p-6 bg-marble-light">
          <h2 className="text-gold-light font-display font-semibold text-lg mb-4">Before You Write</h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Many common questions are already answered in our Help section. Check there first — you might
            find an instant answer.
          </p>
          <Link
            to="/help"
            className="inline-block px-6 py-2 border border-gold text-gold rounded hover:bg-gold hover:text-marble transition-colors font-display text-sm"
          >
            Browse Help & FAQ
          </Link>
        </div>

        <p className="text-gray-500 text-xs text-center mt-8">
          Average response time: under 24 hours on business days.
        </p>
      </div>
    </div>
  )
}
