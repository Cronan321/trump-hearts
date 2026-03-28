import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getTables } from '../api/tables'
import type { TableResponse, GamePhase } from '../types'

// ─── WebSocket message shapes ─────────────────────────────────────────────────

interface WsPlayerJoined { type: 'player_joined'; player_id: string; username: string; seat_index: number }
interface WsPlayerLeft   { type: 'player_left';   player_id: string }
interface WsGameState    { type: 'game_state';     state: { phase: GamePhase; players: { player_id: string; username: string; seat_index: number }[] } }

type WsMessage = WsPlayerJoined | WsPlayerLeft | WsGameState

// ─── Seat slot component ──────────────────────────────────────────────────────

interface SeatSlotProps {
  username: string | null
  seatIndex: number
}

function SeatSlot({ username, seatIndex }: SeatSlotProps) {
  const filled = username !== null
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
        filled
          ? 'border-gold/60 bg-marble-light shadow-gold'
          : 'border-gold/20 bg-marble-light/40'
      }`}
    >
      {/* Avatar circle */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 ${
          filled ? 'border-gold bg-marble' : 'border-gold/20 bg-marble/50'
        }`}
      >
        {filled ? (
          <span className="text-gold font-display font-bold text-base">
            {username!.charAt(0).toUpperCase()}
          </span>
        ) : (
          <span className="text-gold/20 text-lg">?</span>
        )}
      </div>

      {/* Name / status */}
      <div className="flex flex-col min-w-0">
        <span className={`text-sm font-display font-semibold truncate ${filled ? 'text-gray-100' : 'text-gold/30'}`}>
          {filled ? username : 'Waiting...'}
        </span>
        <span className="text-[11px] text-gold/40 font-mono">Seat {seatIndex + 1}</span>
      </div>

      {/* Status badge */}
      {filled && (
        <span className="ml-auto text-[10px] text-gold bg-gold/10 border border-gold/30 rounded px-2 py-0.5 font-mono shrink-0">
          Ready
        </span>
      )}
    </div>
  )
}

// ─── Rule config summary ──────────────────────────────────────────────────────

interface RuleConfigSummaryProps {
  table: TableResponse
}

function RuleConfigSummary({ table }: RuleConfigSummaryProps) {
  const { rule_config } = table
  const directionLabel: Record<string, string> = {
    left: 'Pass Left',
    right: 'Pass Right',
    across: 'Pass Across',
    keep: 'No Passing',
  }

  const variants: string[] = []
  if (rule_config.jack_of_diamonds) variants.push('Jack of Diamonds')
  if (rule_config.breaking_hearts) variants.push('Breaking Hearts')
  if (!rule_config.first_trick_points) variants.push('No First-Trick Points')
  if (rule_config.shoot_the_moon === 'subtract_from_self') variants.push('Shoot the Moon (subtract)')

  return (
    <div className="bg-marble-light/50 border border-gold/20 rounded-lg px-4 py-3 flex flex-wrap gap-2 items-center">
      <span className="text-gold/80 text-xs font-display font-semibold uppercase tracking-wider mr-1">Rules:</span>
      <span className="text-xs text-gray-300 bg-marble border border-gold/20 rounded px-2 py-0.5 font-mono">
        {directionLabel[rule_config.passing_direction] ?? rule_config.passing_direction}
      </span>
      {variants.map((v) => (
        <span key={v} className="text-xs text-gray-300 bg-marble border border-gold/20 rounded px-2 py-0.5 font-mono">
          {v}
        </span>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface SeatInfo {
  player_id: string
  username: string
  seat_index: number
}

export default function WaitingRoomPage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [table, setTable] = useState<TableResponse | null>(null)
  const [seats, setSeats] = useState<SeatInfo[]>([])
  const [connected, setConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)

  // ── Fetch table info ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return
    getTables(token)
      .then((tables) => {
        const found = tables.find((t) => t.table_id === tableId)
        if (found) setTable(found)
      })
      .catch(console.error)
  }, [tableId, token])

  // ── WebSocket connection ───────────────────────────────────────────────────

  useEffect(() => {
    if (!tableId || !token) return

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/table/${tableId}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      let msg: WsMessage
      try {
        msg = JSON.parse(event.data) as WsMessage
      } catch {
        return
      }

      switch (msg.type) {
        case 'player_joined':
          setSeats((prev) => {
            // avoid duplicates
            if (prev.some((s) => s.player_id === msg.player_id)) return prev
            return [...prev, { player_id: msg.player_id, username: msg.username, seat_index: msg.seat_index }]
          })
          break

        case 'player_left':
          setSeats((prev) => prev.filter((s) => s.player_id !== msg.player_id))
          break

        case 'game_state': {
          // Sync seat list from full state
          setSeats(
            msg.state.players.map((p) => ({
              player_id: p.player_id,
              username: p.username,
              seat_index: p.seat_index,
            }))
          )
          // Navigate to game table when game starts
          const { phase } = msg.state
          if (phase === 'passing' || phase === 'playing') {
            navigate(`/table/${tableId}`, { replace: true })
          }
          break
        }
      }
    }

    ws.onerror = (e) => console.error('[WaitingRoom] WebSocket error', e)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [tableId, token, navigate])

  // ── Build 4-slot display ───────────────────────────────────────────────────

  const seatSlots = Array.from({ length: 4 }, (_, i) => {
    const found = seats.find((s) => s.seat_index === i)
    return { seatIndex: i, username: found?.username ?? null }
  })

  const playerCount = seats.length

  // ── Leave table ────────────────────────────────────────────────────────────

  const handleLeave = () => {
    wsRef.current?.close()
    navigate('/lobby')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full bg-marble-dark bg-marble-texture flex items-center justify-center p-4">
      <div className="w-full max-w-md border-2 border-gold/40 rounded-xl shadow-gold-lg bg-marble overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-marble-dark border-b border-gold/30 flex items-center justify-between">
          <div>
            <h1 className="text-gold font-display font-bold text-xl tracking-wide">
              {table?.name ?? 'Loading...'}
            </h1>
            <p className="text-gold/50 text-xs font-mono mt-0.5">Waiting for players</p>
          </div>
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-[11px] text-gold/40 font-mono">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Player count */}
          <div className="flex items-center justify-between">
            <span className="text-gold/70 text-sm font-display font-semibold">Players</span>
            <span className="text-gold font-display font-bold text-lg">{playerCount}/4</span>
          </div>

          {/* Rule config summary */}
          {table && <RuleConfigSummary table={table} />}

          {/* Seat slots */}
          <div className="flex flex-col gap-2">
            {seatSlots.map((slot) => (
              <SeatSlot key={slot.seatIndex} username={slot.username} seatIndex={slot.seatIndex} />
            ))}
          </div>

          {/* Waiting animation */}
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-gold/50 text-xs font-display italic">
              Waiting for {4 - playerCount} more player{4 - playerCount !== 1 ? 's' : ''}...
            </span>
          </div>

          {/* Leave button */}
          <button
            onClick={handleLeave}
            className="w-full py-2.5 rounded-lg border border-gold/40 text-gold/70 text-sm font-display font-semibold
              hover:border-gold hover:text-gold hover:bg-gold/5 transition-all duration-200"
          >
            Leave Table
          </button>
        </div>
      </div>
    </div>
  )
}
