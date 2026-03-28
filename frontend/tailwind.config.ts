import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0D060',
          dark: '#A08020',
        },
        marble: {
          DEFAULT: '#1A1A1A',
          light: '#2C2C2C',
          dark: '#0D0D0D',
        },
      },
      backgroundImage: {
        'marble-texture': [
          'linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%)',
          'linear-gradient(225deg, rgba(255,255,255,0.03) 25%, transparent 25%)',
          'linear-gradient(315deg, rgba(255,255,255,0.03) 25%, transparent 25%)',
          'linear-gradient(45deg,  rgba(255,255,255,0.03) 25%, transparent 25%)',
          'linear-gradient(160deg, #0D0D0D 0%, #1A1A1A 40%, #111111 60%, #0D0D0D 100%)',
        ].join(', '),
      },
      backgroundSize: {
        'marble-texture': '60px 60px, 60px 60px, 60px 60px, 60px 60px, 100% 100%',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 12px rgba(212, 175, 55, 0.5)',
        'gold-lg': '0 0 24px rgba(212, 175, 55, 0.7)',
      },
      borderColor: {
        gold: '#D4AF37',
      },
    },
  },
  plugins: [],
}

export default config
