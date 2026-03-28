import { Link } from 'react-router-dom'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'How do I start a game?',
    answer:
      'From the Lobby, click "Create Table" to start a new game or join an existing table by clicking "Join" next to any open table. Once 4 players are seated, the game begins automatically.',
  },
  {
    question: 'What is the Trump card mechanic?',
    answer:
      'At the start of each round, a trump suit is declared. Cards of the trump suit beat cards of any other suit, regardless of rank. The trump suit rotates each round to keep gameplay dynamic.',
  },
  {
    question: 'How does card passing work?',
    answer:
      'Before each round, players pass 3 cards to another player. The direction of passing rotates: left, right, across, and then no passing (hold). Choose wisely — passing high hearts or the Queen of Spades can shift the game.',
  },
  {
    question: 'What is "Shooting the Moon"?',
    answer:
      'If one player takes all 13 hearts and the Queen of Spades in a single round, they "shoot the moon." Instead of gaining 26 points, all other players receive 26 points. High risk, high reward!',
  },
  {
    question: 'How are coins earned?',
    answer:
      'You earn coins by winning games and completing daily challenges. Coins are used to join tables with higher stakes. New accounts start with a welcome bonus of coins.',
  },
  {
    question: 'Can I play with friends?',
    answer:
      'Yes! Share your table name or invite friends directly from the lobby. Private tables can be created with a password so only invited players can join.',
  },
  {
    question: 'What happens if a player disconnects?',
    answer:
      'If a player disconnects, the game pauses briefly to allow reconnection. If they do not reconnect within the timeout window, an AI player will take over for that seat.',
  },
  {
    question: 'How do I report a bug or player?',
    answer:
      'Use the in-game report button or visit our Contact page. We take fair play seriously and review all reports promptly.',
  },
]

export default function HelpFAQPage() {
  return (
    <div className="min-h-screen bg-marble text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/lobby" className="text-gold hover:text-gold-light text-sm mb-8 inline-block">
          ← Back to Lobby
        </Link>

        <h1 className="text-gold text-4xl font-display font-bold mb-2">Help & FAQ</h1>
        <p className="text-gray-400 text-sm mb-10">
          Answers to the most common questions about Trump Hearts.
        </p>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gold/30 rounded-lg p-5 bg-marble-light"
            >
              <h2 className="text-gold-light font-display font-semibold text-lg mb-2">
                {faq.question}
              </h2>
              <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-gold/30 rounded-lg p-5 bg-marble-light text-center">
          <p className="text-gray-300 mb-3">Still have questions?</p>
          <Link
            to="/contact"
            className="inline-block px-6 py-2 border border-gold text-gold rounded hover:bg-gold hover:text-marble transition-colors font-display"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
