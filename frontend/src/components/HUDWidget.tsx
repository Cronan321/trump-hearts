import type { PlayerState } from '../types'

interface HUDWidgetProps {
  player: PlayerState
  onClick: () => void
  isHistoryOpen: boolean
}

export default function HUDWidget({ player, onClick, isHistoryOpen }: HUDWidgetProps) {
  return (
    <button
      onClick={onClick}
      aria-label={isHistoryOpen ? 'Close history panel' : 'Open history panel'}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none
        bg-marble-dark/80 backdrop-blur-sm border transition-all duration-200
        hover:bg-marble-light/80 focus:outline-none focus:ring-2 focus:ring-gold/60
        ${isHistoryOpen
          ? 'border-gold shadow-gold-lg'
          : 'border-gold/30 hover:border-gold/60'
        }
      `}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full border border-gold/50 flex items-center justify-center overflow-hidden shrink-0 bg-marble-light">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gold text-sm font-display font-bold">
            {player.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-start min-w-0">
        <span className="text-gold text-xs font-display font-semibold truncate max-w-[80px] leading-tight">
          {player.username}
        </span>
        <div className="flex gap-2 text-[10px] leading-tight">
          <span className="text-gray-400">
            Total: <span className="text-white font-semibold font-mono">{player.cumulative_score}</span>
          </span>
          <span className="text-gray-400">
            Round: <span className="text-yellow-300 font-semibold font-mono">{player.round_score}</span>
          </span>
        </div>
      </div>
    </button>
  )
}
