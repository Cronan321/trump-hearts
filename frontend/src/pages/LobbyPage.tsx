import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTables, joinTable } from '../api/tables'
import { useAuthStore } from '../store/authStore'
import { useLobbyStore } from '../store/lobbyStore'
import type { TableResponse } from '../types'
import CreateTableModal from '../components/CreateTableModal'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

// ── Rule variant badge helpers ────────────────────────────────────────────────

function RuleBadges({ rule_config }: { rule_config: TableResponse['rule_config'] }) {
  const badges: string[] = []
  if (rule_config.jack_of_diamonds) badges.push('J♦ -10')
  if (rule_config.shoot_the_moon === 'subtract_from_self') badges.push('Moon -26')
  else badges.push('Moon +26')
  if (!rule_config.breaking_hearts) badges.push('Free Hearts')
  if (!rule_config.first_trick_points) badges.push('Clean 1st')

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {badges.map((b) => (
        <span
          key={b}
          className="text-xs px-2 py-0.5 rounded-full border border-gold/50 text-gold-light bg-marble"
        >
          {b}
        </span>
      ))}
    </div>
  )
}

// ── Table card ────────────────────────────────────────────────────────────────

interface TableCardProps {
  table: TableResponse
  onJoin: (tableId: string) => void
  joining: string | null
}

function TableCard({ table, onJoin, joining }: TableCardProps) {
  const isFull = table.player_count >= table.max_players
  const isJoining = joining === table.table_id

  return (
    <div
      className={`
        relative rounded-lg border p-4 flex flex-col gap-2
        bg-marble-light transition-shadow
        ${isFull ? 'border-gray-600 opacity-70' : 'border-gold/60 shadow-gold hover:shadow-gold-lg'}
      `}
    >
      {/* Status pill */}
      {table.status === 'in_progress' && (
        <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-amber-700/60 text-amber-200 border border-amber-500/40">
          In Progress
        </span>
      )}

      <h3 className="text-gold font-display font-semibold text-lg leading-tight pr-20 truncate">
        {table.name}
      </h3>

      <p className="text-gray-300 text-sm">
        Players:{' '}
        <span className={isFull ? 'text-red-400' : 'text-green-400'}>
          {table.player_count}/{table.max_players}
        </span>
      </p>

      <RuleBadges rule_config={table.rule_config} />

      <button
        onClick={() => onJoin(table.table_id)}
        disabled={isFull || isJoining}
        className={`
          mt-auto self-start px-4 py-1.5 rounded font-semibold text-sm transition-colors
          ${isFull
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gold text-marble hover:bg-gold-light active:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed'
          }
        `}
      >
        {isJoining ? 'Joining…' : isFull ? 'Full' : 'Join'}
      </button>
    </div>
  )
}

// ── LobbyPage ─────────────────────────────────────────────────────────────────

export default function LobbyPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const { tables, setTables, addTable, updateTable, removeTable } = useLobbyStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    getTables(token)
      .then((data) => {
        setTables(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load tables.')
        setLoading(false)
      })
  }, [token, setTables])

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const ws = new WebSocket(`${WS_URL}/ws/lobby?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string)
        if (msg.type === 'table_update') setTables(msg.tables)
        else if (msg.type === 'table_added') addTable(msg.table)
        else if (msg.type === 'table_removed') removeTable(msg.table_id)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // silently ignore; REST data is still shown
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [token, setTables, addTable, updateTable, removeTable])

  // ── Join handler ───────────────────────────────────────────────────────────
  const handleJoin = useCallback(
    async (tableId: string) => {
      if (!token) return
      setJoining(tableId)
      try {
        await joinTable(token, tableId)
        navigate(`/table/${tableId}`)
      } catch (err: unknown) {
        const e = err as { detail?: string }
        setError(e.detail ?? 'Could not join table.')
        setJoining(null)
      }
    },
    [token, navigate],
  )

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    localStorage.removeItem('token')
    clearAuth()
    navigate('/login')
  }

  // ── Sort: available first ──────────────────────────────────────────────────
  const sortedTables = [...tables].sort((a, b) => {
    const aFull = a.player_count >= a.max_players ? 1 : 0
    const bFull = b.player_count >= b.max_players ? 1 : 0
    return aFull - bFull
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-marble text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gold/30 bg-marble-dark px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <h1 className="text-gold font-display font-bold text-2xl sm:text-3xl tracking-wide flex items-center gap-3">
          <img src="/logo.png" alt="Trump Hearts" className="h-10 w-auto" />
          Trump Hearts
        </h1>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-gold-light text-sm hidden sm:block">
              {user.username} · <span className="text-yellow-400">🪙 {user.coin_balance.toLocaleString()}</span>
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h2 className="text-gold-light font-display text-xl">Game Lobby</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gold px-5 py-2 text-sm font-semibold"
          >
            + Create Table
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 px-4 py-2 rounded border border-red-500/50 bg-red-900/20 text-red-300 text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-gold animate-pulse text-lg">Loading tables…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && sortedTables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <p className="text-gray-400 text-lg">No tables yet.</p>
            <p className="text-gray-500 text-sm">Be the first to create one!</p>
          </div>
        )}

        {/* Table grid */}
        {!loading && sortedTables.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedTables.map((table) => (
              <TableCard
                key={table.table_id}
                table={table}
                onJoin={handleJoin}
                joining={joining}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Table Modal */}
      {showCreateModal && (
        <CreateTableModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(table) => addTable(table)}
        />
      )}
    </div>
  )
}
