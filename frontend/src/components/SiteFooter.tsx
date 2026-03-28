import { Link } from 'react-router-dom'

const links = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Use', to: '/terms' },
  { label: 'Help & FAQ', to: '/help' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Cookie Policy', to: '/cookies' },
]

export default function SiteFooter() {
  return (
    <footer className="bg-marble-dark border-t border-gold/30 py-3 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-gold/60 text-xs font-body">
          © 2025 Trump Hearts. All rights reserved.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {links.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="text-gold/70 hover:text-gold text-xs font-body transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
