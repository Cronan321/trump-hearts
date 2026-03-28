import type { Card } from '../types'

interface CardComponentProps {
  card: Card | null // null = face-down card back
  isSelected?: boolean // for passing phase selection
  isLegal?: boolean // true = can be played, false = dimmed
  isPlayable?: boolean // true = clickable
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg' // default 'md'
}

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
}

const SIZE_CLASSES = {
  sm: 'w-8 h-12 text-xs',
  md: 'w-12 h-16 text-sm',
  lg: 'w-16 h-24 text-base',
}

const CENTER_SUIT_SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
}

const CORNER_SIZE = {
  sm: 'text-[8px] leading-tight',
  md: 'text-[10px] leading-tight',
  lg: 'text-xs leading-tight',
}

const FACE_RANKS = new Set(['J', 'Q', 'K', 'A'])

function isRedSuit(suit: string): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

function isQueenOfSpades(card: Card): boolean {
  return card.suit === 'spades' && card.rank === 'Q'
}

function isJackOfDiamonds(card: Card): boolean {
  return card.suit === 'diamonds' && card.rank === 'J'
}

// Card back component
function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: { width: 32, height: 48 },
    md: { width: 48, height: 64 },
    lg: { width: 64, height: 96 },
  }
  const { width, height } = sizeMap[size]
  return (
    <div
      className="rounded-md border-2 border-gold select-none overflow-hidden"
      style={{ width: Math.max(width, 44), height: Math.max(height, 44), minWidth: 44, minHeight: 44 }}
    >
      <img
        src="/card-back.png"
        alt="Card back"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  )
}

export default function CardComponent({
  card,
  isSelected = false,
  isLegal = true,
  isPlayable = false,
  onClick,
  size = 'md',
}: CardComponentProps) {
  if (card === null) {
    return <CardBack size={size} />
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const red = isRedSuit(card.suit)
  const qos = isQueenOfSpades(card)
  const jod = isJackOfDiamonds(card)
  const isFaceCard = FACE_RANKS.has(card.rank)

  const suitColor = red ? 'text-red-600' : 'text-gray-900'

  const borderClass = qos
    ? 'border-2 border-gold shadow-gold-lg'
    : isSelected
    ? 'border-2 border-gold shadow-gold'
    : 'border border-gray-300'

  const opacityClass = !isLegal ? 'opacity-50' : ''

  const cursorClass = isPlayable && isLegal ? 'cursor-pointer' : 'cursor-default'

  const hoverClass =
    isPlayable && isLegal
      ? 'hover:-translate-y-1 hover:shadow-lg transition-transform duration-150'
      : ''

  const selectedRing = isSelected ? 'ring-2 ring-gold ring-offset-1' : ''

  return (
    <div
      className={`
        ${SIZE_CLASSES[size]}
        rounded-md bg-white
        ${borderClass}
        ${opacityClass}
        ${cursorClass}
        ${hoverClass}
        ${selectedRing}
        relative flex flex-col justify-between p-0.5
        select-none
      `}
      style={{ minWidth: 44, minHeight: 44 }}
      onClick={isPlayable && isLegal ? onClick : undefined}
      role={isPlayable && isLegal ? 'button' : undefined}
      tabIndex={isPlayable && isLegal ? 0 : undefined}
      onKeyDown={
        isPlayable && isLegal
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.()
            }
          : undefined
      }
      aria-label={`${card.rank} of ${card.suit}${isSelected ? ', selected' : ''}${!isLegal ? ', cannot play' : ''}`}
    >
      {/* Top-left corner */}
      <div className={`flex flex-col items-center leading-none ${CORNER_SIZE[size]} ${suitColor}`}>
        <span className="font-bold font-display">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center justify-center flex-1">
        <span className={`${CENTER_SUIT_SIZE[size]} ${suitColor}`}>{suitSymbol}</span>

        {/* Face card watermark */}
        {isFaceCard && (
          <span
            className="text-gold font-display font-bold leading-none"
            style={{ fontSize: size === 'lg' ? 8 : 6 }}
          >
            {qos ? '👑' : '✦'}
          </span>
        )}

        {/* Queen of Spades branding */}
        {qos && (
          <span
            className="text-gold font-display font-bold uppercase tracking-widest leading-none"
            style={{ fontSize: size === 'lg' ? 7 : 5 }}
          >
            BIGLY
          </span>
        )}

        {/* Jack of Diamonds badge */}
        {jod && (
          <span
            className="bg-gold text-marble font-bold rounded-sm px-0.5 leading-none"
            style={{ fontSize: size === 'lg' ? 8 : 6 }}
          >
            -10
          </span>
        )}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div
        className={`flex flex-col items-center leading-none ${CORNER_SIZE[size]} ${suitColor} rotate-180 self-end`}
      >
        <span className="font-bold font-display">{card.rank}</span>
        <span>{suitSymbol}</span>
      </div>
    </div>
  )
}
