import { Link } from 'react-router-dom'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">Cookie Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: January 1, 2025</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">What Are Cookies?</h2>
            <p className="text-gray-300 leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help the site
              remember information about your visit, making your next visit easier and the site more useful to you.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Cookies We Use</h2>
            <div className="space-y-4">
              <div className="border border-gold/20 rounded p-4 bg-marble-light">
                <h3 className="text-gold text-base font-semibold mb-1">Essential Cookies</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Required for the platform to function. These include your authentication token and session
                  identifiers. You cannot opt out of these without losing access to the platform.
                </p>
              </div>
              <div className="border border-gold/20 rounded p-4 bg-marble-light">
                <h3 className="text-gold text-base font-semibold mb-1">Preference Cookies</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Remember your settings such as sound preferences, chat visibility, and display options so
                  you don't have to reconfigure them each visit.
                </p>
              </div>
              <div className="border border-gold/20 rounded p-4 bg-marble-light">
                <h3 className="text-gold text-base font-semibold mb-1">Analytics Cookies</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Help us understand how players use Trump Hearts — which features are popular, where errors
                  occur, and how we can improve performance. Data is aggregated and anonymized.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Managing Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              You can control cookies through your browser settings. Disabling essential cookies will prevent
              you from logging in. Most browsers allow you to block or delete cookies — consult your browser's
              help documentation for instructions.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">Third-Party Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              We may use third-party services for analytics and error monitoring. These services may set their
              own cookies subject to their respective privacy policies. We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-gold-light text-xl font-display font-semibold mb-3">More Information</h2>
            <p className="text-gray-300 leading-relaxed">
              For more details on how we handle your data, see our{' '}
              <Link to="/privacy" className="text-gold hover:text-gold-light underline">
                Privacy Policy
              </Link>
              . Questions? Visit our{' '}
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
