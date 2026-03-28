import { useEffect, useRef } from 'react'
import type { TrickRecord } from '../store/gameStore'
import type { PlayerState } from '../types'
import CardComponent from './CardComponent'

export interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  trickHistory: TrickRecord[]
  players: PlayerState[]
}

export default function HistoryPanel({ isOpen, onClose, trickHistory, players }: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const getPlayerName = (id: string) =>
    players.find((p) => p.player_id === id)?.username ?? id

  // Group tricks by round
  const byRound = trickHistory.reduce<Record<number, TrickRecord[]>>((acc, trick) => {
    if (!acc[trick.roundNumber]) acc[trick.roundNumber] = []
    acc[trick.roundNumber].push(trick)
    return acc
  }, {})

  const roundNumbers = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trick history"
        className={`fixed top-0 left-0 h-full z-50 w-80 sm:w-96 flex flex-col
          bg-marble-dark border-r-2 border-gold/60 shadow-gold-lg
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/30 shrink-0">
          <h2 className="text-gold font-display font-bold text-base tracking-widest uppercase">
            Trick History
          </h2>
          <button
            onClick={onClose}
            aria-label="Close history panel"
            className="text-gold/70 hover:text-gold transition-colors text-xl leading-none font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {trickHistory.length === 0 ? (
            <p className="text-gold/40 text-sm font-display italic text-center mt-8">
              No history available yet.
            </p>
          ) : (
            roundNumbers.map((round) => (
              <div key={round}>
                {/* Round header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gold/30" />
                  <span className="text-gold font-display font-bold text-xs tracking-widest uppercase px-2">
                    Round {round}
                  </span>
                  <div className="flex-1 h-px bg-gold/30" />
                </div>

                {/* Tricks in this round */}
                <div className="space-y-2">
                  {byRound[round].map((trick) => (
                    <TrickRow
                      key={`${trick.roundNumber}-${trick.trickNumber}`}
                      trick={trick}
                      getPlayerName={getPlayerName}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

interface TrickRowProps {
  trick: TrickRecord
  getPlayerName: (id: string) => string
}

function TrickRow({ trick, getPlayerName }: TrickRowProps) {
  const entries = Object.entries(trick.cardsPlayed)

  return (
    <div className="bg-marble-light/60 border border-gold/20 rounded-lg px-3 py-2">
      {/* Trick number + winner */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gold/60 text-[10px] font-mono uppercase tracking-wider">
          Trick {trick.trickNumber}
        </span>
        <span className="text-yellow-300 text-[10px] font-display font-semibold truncate max-w-[120px]">
          ✓ {getPlayerName(trick.winnerId)}
        </span>
      </div>

      {/* Cards played */}
      <div className="flex flex-wrap gap-1">
        {entries.map(([playerId, card]) => (
          <div key={playerId} className="flex flex-col items-center gap-0.5">
            <CardComponent card={card} size="sm" />
            <span className="text-[8px] text-gold/40 font-display truncate max-w-[32px]">
              {getPlayerName(playerId)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
