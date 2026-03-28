import type { Card, GamePhase } from '../types'
import CardComponent from './CardComponent'

interface PlayerHandProps {
  hand: Card[]
  legalPlays: Card[]
  phase: GamePhase
  selectedCards: Card[]
  onPlayCard: (card: Card) => void
  onTogglePassCard: (card: Card) => void
  onConfirmPass: () => void
  isMyTurn: boolean
}

function isSameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank
}

export default function PlayerHand({
  hand,
  legalPlays,
  phase,
  selectedCards,
  onPlayCard,
  onTogglePassCard,
  onConfirmPass,
  isMyTurn,
}: PlayerHandProps) {
  const isPlaying = phase === 'playing' && isMyTurn
  const isPassing = phase === 'passing'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Card fan */}
      <div
        className="flex items-end justify-center overflow-x-auto max-w-full pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex items-end" style={{ gap: '-4px' }}>
          {hand.map((card, i) => {
            const isLegal = isPlaying
              ? legalPlays.some((c) => isSameCard(c, card))
              : true
            const isSelected = selectedCards.some((c) => isSameCard(c, card))
            const isPlayable = isPlaying ? isLegal : isPassing

            const handleClick = () => {
              if (isPlaying && isLegal) {
                onPlayCard(card)
              } else if (isPassing) {
                // Allow deselect always; only allow select if < 3 selected or already selected
                if (isSelected || selectedCards.length < 3) {
                  onTogglePassCard(card)
                }
              }
            }

            return (
              <div
                key={`${card.suit}-${card.rank}-${i}`}
                className="transition-transform duration-150"
                style={{
                  marginLeft: i === 0 ? 0 : -12,
                  zIndex: i,
                  position: 'relative',
                }}
              >
                {phase === 'playing' || phase === 'passing' ? (
                  <CardComponent
                    card={card}
                    isSelected={isSelected}
                    isLegal={isPlaying ? isLegal : true}
                    isPlayable={isPlayable}
                    onClick={handleClick}
                    size="md"
                  />
                ) : (
                  // Other phases: show face-down
                  <CardComponent card={null} size="md" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Passing phase confirm button */}
      {isPassing && (
        <button
          onClick={onConfirmPass}
          disabled={selectedCards.length !== 3}
          className={`
            px-4 py-2 rounded-lg border font-display font-semibold text-sm tracking-wide
            transition-all duration-150
            ${
              selectedCards.length === 3
                ? 'border-gold bg-gold/20 text-gold hover:bg-gold/30 cursor-pointer shadow-gold'
                : 'border-gold/30 bg-transparent text-gold/30 cursor-not-allowed'
            }
          `}
        >
          Confirm Pass ({selectedCards.length}/3)
        </button>
      )}
    </div>
  )
}
