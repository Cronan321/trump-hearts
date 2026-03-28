import type { PlayerState } from '../types'

interface ScoreBoardProps {
  players: PlayerState[]
  mode: 'mid-game' | 'end-game'
  winners?: string[]
  rematchReadyCount?: number
  rematchTotal?: number
  onRematch?: () => void
}

export default function ScoreBoard({
  players,
  mode,
  winners = [],
  rematchReadyCount = 0,
  rematchTotal = 4,
  onRematch,
}: ScoreBoardProps) {
  if (mode === 'mid-game') {
    return <MidGameScoreBoard players={players} />
  }
  return (
    <EndGameScoreBoard
      players={players}
      winners={winners}
      rematchReadyCount={rematchReadyCount}
      rematchTotal={rematchTotal}
      onRematch={onRematch}
    />
  )
}

// ─── Mid-game compact table ───────────────────────────────────────────────────

function MidGameScoreBoard({ players }: { players: PlayerState[] }) {
  const minScore = Math.min(...players.map((p) => p.cumulative_score))

  return (
    <div className="bg-marble-dark border border-gold/40 rounded-lg overflow-hidden shadow-gold">
      <div className="px-3 py-1.5 border-b border-gold/30 bg-marble-light">
        <span className="text-gold font-display font-bold text-xs tracking-widest uppercase">Scores</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gold/20">
            <th className="text-left px-3 py-1 text-gold/60 font-display font-normal">Player</th>
            <th className="text-right px-2 py-1 text-gold/60 font-display font-normal">Game</th>
            <th className="text-right px-3 py-1 text-gold/60 font-display font-normal">Round</th>
          </tr>
        </thead>
        <tbody>
          {players
            .slice()
            .sort((a, b) => a.cumulative_score - b.cumulative_score)
            .map((player) => {
              const isLeading = player.cumulative_score === minScore
              return (
                <tr
                  key={player.player_id}
                  className={`border-b border-gold/10 last:border-0 ${
                    isLeading ? 'bg-gold/10' : ''
                  }`}
                >
                  <td className={`px-3 py-1.5 font-display font-semibold truncate max-w-[80px] ${isLeading ? 'text-gold' : 'text-gray-200'}`}>
                    {isLeading && '★ '}{player.username}
                  </td>
                  <td className={`text-right px-2 py-1.5 font-mono font-bold ${isLeading ? 'text-gold' : 'text-white'}`}>
                    {player.cumulative_score}
                  </td>
                  <td className="text-right px-3 py-1.5 font-mono font-bold text-yellow-300">
                    {player.round_score}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}

// ─── End-game full scoreboard ─────────────────────────────────────────────────

interface EndGameScoreBoardProps {
  players: PlayerState[]
  winners: string[]
  rematchReadyCount: number
  rematchTotal: number
  onRematch?: () => void
}

function EndGameScoreBoard({
  players,
  winners,
  rematchReadyCount,
  rematchTotal,
  onRematch,
}: EndGameScoreBoardProps) {
  const allReady = rematchReadyCount >= rematchTotal
  const sorted = players.slice().sort((a, b) => a.cumulative_score - b.cumulative_score)

  return (
    <div className="bg-marble-dark border-2 border-gold rounded-xl p-8 shadow-gold-lg min-w-[280px] max-w-sm w-full mx-4">
      <h2 className="text-gold font-display font-bold text-2xl text-center mb-2 tracking-widest uppercase">
        Game Over
      </h2>
      <p className="text-center text-gray-300 text-sm mb-6 font-display">
        {winners.length === 1
          ? `${players.find((p) => p.player_id === winners[0])?.username ?? winners[0]} wins!`
          : "It's a tie!"}
      </p>

      {/* Final scores sorted lowest first */}
      <div className="flex flex-col gap-2 mb-6">
        {sorted.map((player) => {
          const isWinner = winners.includes(player.player_id)
          return (
            <div
              key={player.player_id}
              className={`flex justify-between items-center px-3 py-2 rounded-lg ${
                isWinner ? 'bg-gold/20 border border-gold/50' : 'bg-marble-light'
              }`}
            >
              <span className={`font-display font-semibold text-sm ${isWinner ? 'text-gold' : 'text-gray-200'}`}>
                {isWinner && '🏆 '}{player.username}
              </span>
              <span className={`font-mono font-bold text-sm ${isWinner ? 'text-gold' : 'text-white'}`}>
                {player.cumulative_score} pts
              </span>
            </div>
          )
        })}
      </div>

      {/* Rematch button */}
      <button
        onClick={onRematch}
        disabled={allReady}
        className="w-full py-3 rounded-lg border-2 border-gold bg-gold/10 text-gold font-display font-bold text-sm tracking-widest uppercase hover:bg-gold/20 transition-colors shadow-gold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {allReady ? 'Starting…' : 'Rematch'}
      </button>

      {/* Ready count */}
      {rematchReadyCount > 0 && (
        <p className="text-center text-gold/60 text-xs font-display mt-2">
          {rematchReadyCount}/{rematchTotal} ready
        </p>
      )}
    </div>
  )
}
