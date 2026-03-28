import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMe } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useGameStore } from '../store/gameStore'
import { useVoiceChat } from '../hooks/useVoiceChat'
import type { RTCSignalMessage } from '../hooks/useVoiceChat'
import { useSoundEffects } from '../hooks/useSoundEffects'
import ChatBox from '../components/ChatBox'
import QuickChatMenu from '../components/QuickChatMenu'
import PushToTalkButton from '../components/PushToTalkButton'
import PlayerHand from '../components/PlayerHand'
import CardComponent from '../components/CardComponent'
import ScoreBoard from '../components/ScoreBoard'
import HUDWidget from '../components/HUDWidget'
import HistoryPanel from '../components/HistoryPanel'
import type { Card, GameState, PlayerState } from '../types'

// ─── WebSocket message shapes ────────────────────────────────────────────────

interface WsGameState    { type: 'game_state';    state: GameState }
interface WsChatMessage  { type: 'chat_message';  sender: string; text: string; timestamp: string }
interface WsTrickResult  { type: 'trick_result';  trick: { cards_played: Record<string, { suit: string; rank: string }>; trick_number: number }; winner: string }
interface WsRoundEnd     { type: 'round_end';     scores: Record<string, number>; shoot_the_moon: boolean }
interface WsGameEnd      { type: 'game_end';      final_scores: Record<string, number>; winners: string[] }
interface WsTurnChange   { type: 'turn_change';   current_player_id: string }
interface WsRtcSignal    { type: 'rtc_signal';    from: string; signal: RTCSignalMessage }

type WsMessage = WsGameState | WsChatMessage | WsTrickResult | WsRoundEnd | WsGameEnd | WsTurnChange | WsRtcSignal

// ─── Quick-chat preset lookup ─────────────────────────────────────────────────

const QUICK_CHAT_PRESETS: Record<number, string> = {
  1: 'Wrong! Totally wrong!',
  2: "That's a beautiful card, believe me.",
  3: 'Nobody plays Hearts better than me.',
  4: "You're fired!",
  5: 'Sad! Very sad play.',
  6: 'Make this table great again!',
  7: "That's what I call a deal!",
  8: 'Tremendous! Just tremendous.',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PlayerAreaProps {
  player: PlayerState | null
  position: 'top' | 'left' | 'right' | 'bottom'
  isCurrentTurn: boolean
  isLocalPlayer: boolean
}

function PlayerArea({ player, position, isCurrentTurn, isLocalPlayer }: PlayerAreaProps) {
  const positionClasses: Record<string, string> = {
    top:    'flex-col items-center',
    left:   'flex-col items-center',
    right:  'flex-col items-center',
    bottom: 'flex-col items-center',
  }

  if (!player) {
    return (
      <div className={`flex ${positionClasses[position]} gap-2`}>
        <div className="w-16 h-16 rounded-full border-2 border-gold/30 bg-marble-light flex items-center justify-center">
          <span className="text-gold/30 text-2xl">?</span>
        </div>
        <span className="text-gold/30 text-xs font-display">Waiting…</span>
      </div>
    )
  }

  return (
    <div className={`flex ${positionClasses[position]} gap-2`}>
      {/* Avatar */}
      <div
        className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isCurrentTurn
            ? 'border-gold shadow-gold-lg animate-pulse'
            : 'border-gold/40'
        } ${isLocalPlayer ? 'ring-2 ring-gold/60' : ''}`}
      >
        {player.avatar_url ? (
          <img src={player.avatar_url} alt={player.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gold text-xl font-display font-bold">
            {player.username.charAt(0).toUpperCase()}
          </span>
        )}
        {isCurrentTurn && (
          <div className="absolute inset-0 bg-gold/10 rounded-full" />
        )}
      </div>

      {/* Name + scores */}
      <div className="flex flex-col items-center gap-0.5 min-w-0">
        <span className={`text-xs font-display font-semibold truncate max-w-[80px] ${isLocalPlayer ? 'text-gold' : 'text-gray-200'}`}>
          {player.username}
        </span>
        <div className="flex gap-2 text-[10px]">
          <span className="text-gray-400">
            Game: <span className="text-white font-semibold">{player.cumulative_score}</span>
          </span>
          <span className="text-gray-400">
            Round: <span className="text-yellow-300 font-semibold">{player.round_score}</span>
          </span>
        </div>
        {/* Card count badge */}
        <span className="text-[10px] text-gold/50 font-mono">
          {isLocalPlayer ? `${player.hand.length} cards` : `${player.hand_size} cards`}
        </span>
      </div>

      {/* Placeholder card fan */}
      {player.hand_size > 0 && (
        <div className="flex -space-x-3 mt-1">
          {Array.from({ length: Math.min(player.hand_size, 5) }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-12 rounded border border-gold/30 bg-marble-light shadow-sm"
              style={{ zIndex: i }}
            />
          ))}
          {player.hand_size > 5 && (
            <div className="w-8 h-12 rounded border border-gold/30 bg-marble-light shadow-sm flex items-center justify-center" style={{ zIndex: 5 }}>
              <span className="text-[9px] text-gold/60">+{player.hand_size - 5}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Trick result overlay ─────────────────────────────────────────────────────

interface TrickResultOverlayProps {
  winnerId: string | null
  winnerName: string | null
}

function TrickResultOverlay({ winnerId, winnerName }: TrickResultOverlayProps) {
  if (!winnerId) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="bg-marble-dark/90 border border-gold rounded-lg px-6 py-3 shadow-gold-lg text-center">
        <p className="text-gold font-display font-bold text-sm tracking-wide">Trick won by</p>
        <p className="text-white font-display text-lg font-bold">{winnerName ?? winnerId}</p>
      </div>
    </div>
  )
}

// ─── Central trick area ───────────────────────────────────────────────────────

interface TrickAreaProps {
  cardsPlayed: Record<string, { suit: string; rank: string }> | undefined
  players: PlayerState[]
  trickWinnerId: string | null
  localSeat: number
}

// Maps a relative seat offset (0=bottom, 1=left, 2=top, 3=right) to a CSS
// position within the cross layout.
const SEAT_OFFSET_TO_POSITION: Record<number, { gridArea: string }> = {
  0: { gridArea: 'bottom' },
  1: { gridArea: 'left' },
  2: { gridArea: 'top' },
  3: { gridArea: 'right' },
}

function TrickArea({ cardsPlayed, players, trickWinnerId, localSeat }: TrickAreaProps) {
  const [animating, setAnimating] = useState(false)

  // When a winner is set, trigger the scale-up + fade-out animation
  useEffect(() => {
    if (trickWinnerId) {
      setAnimating(true)
    } else {
      setAnimating(false)
    }
  }, [trickWinnerId])

  const getPlayerName = (id: string) => players.find((p) => p.player_id === id)?.username ?? id

  // Compute relative seat offset for a given player id
  const getRelativeOffset = (playerId: string): number => {
    const player = players.find((p) => p.player_id === playerId)
    if (!player) return 0
    return ((player.seat_index - localSeat) + 4) % 4
  }

  const entries = cardsPlayed ? Object.entries(cardsPlayed) : []

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Felt-style table center */}
      <div className="relative w-52 h-44 sm:w-72 sm:h-56 rounded-2xl border-2 border-gold/30 bg-green-900/20">

        {entries.length > 0 ? (
          /*
           * Cross / 2×2 grid layout using CSS grid areas:
           *   [.  top  .]
           *   [left . right]
           *   [. bottom .]
           */
          <div
            className="absolute inset-0"
            style={{
              display: 'grid',
              gridTemplateAreas: `
                ". top ."
                "left center right"
                ". bottom ."
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              padding: '4px',
            }}
          >
            {entries.map(([playerId, card]) => {
              const offset = getRelativeOffset(playerId)
              const pos = SEAT_OFFSET_TO_POSITION[offset] ?? { gridArea: 'center' }
              const typedCard = { suit: card.suit as Card['suit'], rank: card.rank as Card['rank'] }

              return (
                <div
                  key={playerId}
                  className="flex flex-col items-center justify-center gap-0.5"
                  style={{
                    gridArea: pos.gridArea,
                    transition: 'transform 0.3s ease, opacity 0.5s ease',
                    transform: animating ? 'scale(1.15)' : 'scale(1)',
                    opacity: animating ? 0.2 : 1,
                  }}
                >
                  <CardComponent card={typedCard} size="lg" />
                  <span className="text-[9px] text-gold/60 truncate max-w-[64px] font-display">
                    {getPlayerName(playerId)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gold/20 text-xs font-display italic">No cards played</span>
          </div>
        )}

        {/* Trick winner overlay */}
        <TrickResultOverlay winnerId={trickWinnerId} winnerName={trickWinnerId ? getPlayerName(trickWinnerId) : null} />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GameTablePage() {
  const { tableId } = useParams<{ tableId: string }>()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const updateCoinBalance = useAuthStore((s) => s.updateCoinBalance)
  const addMessage = useChatStore((s) => s.addMessage)
  const clearMessages = useChatStore((s) => s.clearMessages)
  const gameState = useGameStore((s) => s.gameState)
  const setGameState = useGameStore((s) => s.setGameState)
  const trickHistory = useGameStore((s) => s.trickHistory)
  const addTrickToHistory = useGameStore((s) => s.addTrickToHistory)
  const clearHistory = useGameStore((s) => s.clearHistory)

  const wsRef = useRef<WebSocket | null>(null)
  const rtcSignalHandlerRef = useRef<((from: string, signal: RTCSignalMessage) => void) | null>(null)

  const { playCardSound, playTrickWinSound, playGameEndSound, playShootTheMoonSound } = useSoundEffects()

  const [trickWinnerId, setTrickWinnerId] = useState<string | null>(null)
  const [roundScores, setRoundScores] = useState<Record<string, number> | null>(null)
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null)
  const [gameWinners, setGameWinners] = useState<string[] | null>(null)
  const [selectedCards, setSelectedCards] = useState<Card[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // ── WebSocket send helper ──────────────────────────────────────────────────

  const sendWs = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  // ── WebSocket connect on mount ─────────────────────────────────────────────

  useEffect(() => {
    if (!tableId || !token) return

    clearMessages()
    clearHistory()

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/table/${tableId}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      let msg: WsMessage
      try {
        msg = JSON.parse(event.data) as WsMessage
      } catch {
        return
      }

      switch (msg.type) {
        case 'game_state':
          setGameState(msg.state)
          break

        case 'chat_message':
          addMessage({ sender: msg.sender, text: msg.text, timestamp: msg.timestamp })
          break

        case 'trick_result': {
          // Add to history
          if (gameState) {
            addTrickToHistory({
              roundNumber: gameState.round_number,
              trickNumber: msg.trick.trick_number,
              cardsPlayed: msg.trick.cards_played as Record<string, { suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'; rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' }>,
              winnerId: msg.winner,
            })
          }
          // Show winner briefly
          setTrickWinnerId(msg.winner)
          playTrickWinSound()
          setTimeout(() => setTrickWinnerId(null), 2000)
          break
        }

        case 'round_end':
          setRoundScores(msg.scores)
          if (msg.shoot_the_moon) playShootTheMoonSound()
          setTimeout(() => setRoundScores(null), 4000)
          break

        case 'game_end':
          setFinalScores(msg.final_scores)
          setGameWinners(msg.winners)
          playGameEndSound()
          if (token) {
            getMe(token).then((profile) => updateCoinBalance(profile.coin_balance)).catch(() => {})
          }
          break

        case 'turn_change':
          // turn is reflected in game_state; no extra action needed
          break

        case 'rtc_signal':
          rtcSignalHandlerRef.current?.(msg.from, msg.signal)
          break
      }
    }

    ws.onerror = (e) => console.error('[GameTable] WebSocket error', e)

    return () => {
      ws.close()
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, token])

  // ── Voice chat ─────────────────────────────────────────────────────────────

  const localPlayerId = user?.user_id ?? ''
  const peerPlayerIds = gameState?.players.filter((p) => p.player_id !== localPlayerId).map((p) => p.player_id) ?? []

  const sendSignal = useCallback((to: string, signal: object) => {
    sendWs({ type: 'rtc_signal', to, signal })
  }, [sendWs])

  const onSignal = useCallback((handler: (from: string, signal: RTCSignalMessage) => void) => {
    rtcSignalHandlerRef.current = handler
    return () => { rtcSignalHandlerRef.current = null }
  }, [])

  const { isMicActive, micPermissionDenied, startTalking, stopTalking } = useVoiceChat({
    tableId: tableId ?? '',
    localPlayerId,
    peerPlayerIds,
    sendSignal,
    onSignal,
  })

  // ── Derive player positions ────────────────────────────────────────────────

  const players = gameState?.players ?? []
  const localPlayer = players.find((p) => p.player_id === localPlayerId) ?? null
  const localSeat = localPlayer?.seat_index ?? 0

  // Seat positions relative to local player
  const getPlayerAtRelativeSeat = (offset: number): PlayerState | null => {
    const targetSeat = (localSeat + offset) % 4
    return players.find((p) => p.seat_index === targetSeat) ?? null
  }

  const bottomPlayer = localPlayer
  const leftPlayer   = getPlayerAtRelativeSeat(1)
  const topPlayer    = getPlayerAtRelativeSeat(2)
  const rightPlayer  = getPlayerAtRelativeSeat(3)

  const currentPlayerId = gameState?.current_trick?.current_player_id ?? null

  // ── Chat send handlers ─────────────────────────────────────────────────────

  const handleSendChat = useCallback((text: string) => {
    sendWs({ type: 'chat_message', text })
  }, [sendWs])

  const handleQuickChat = useCallback((messageId: number) => {
    sendWs({ type: 'quick_chat', message_id: messageId })
    // Optimistically show in chat
    if (user) {
      addMessage({
        sender: user.username,
        text: QUICK_CHAT_PRESETS[messageId] ?? '',
        timestamp: new Date().toISOString(),
      })
    }
  }, [sendWs, user, addMessage])

  // ── Rematch ────────────────────────────────────────────────────────────────

  const handleRematch = useCallback(() => {
    sendWs({ type: 'rematch_vote' })
  }, [sendWs])

  // ── Card play / pass handlers ──────────────────────────────────────────────

  const handlePlayCard = useCallback((card: Card) => {
    sendWs({ type: 'play_card', card })
    playCardSound()
  }, [sendWs, playCardSound])

  const handleTogglePassCard = useCallback((card: Card) => {
    setSelectedCards((prev) => {
      const already = prev.some((c) => c.suit === card.suit && c.rank === card.rank)
      if (already) return prev.filter((c) => !(c.suit === card.suit && c.rank === card.rank))
      if (prev.length >= 3) return prev
      return [...prev, card]
    })
  }, [])

  const handleConfirmPass = useCallback(() => {
    if (selectedCards.length === 3) {
      sendWs({ type: 'pass_cards', cards: selectedCards })
      setSelectedCards([])
    }
  }, [sendWs, selectedCards])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full bg-marble-dark bg-marble-texture flex flex-col overflow-hidden">
      {/* Gold border frame */}
      <div className="flex-1 flex flex-col border-2 border-gold/40 m-1 sm:m-2 rounded-xl overflow-hidden shadow-gold-lg min-h-0">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-marble-dark border-b border-gold/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-gold font-display font-bold text-sm tracking-widest uppercase flex items-center gap-2">
              <img src="/logo.png" alt="Trump Hearts" className="h-6 w-auto" />
              Trump Hearts
            </span>
            {gameState && (
              <span className="text-gold/50 text-xs font-mono">
                Round {gameState.round_number} · {gameState.phase}
              </span>
            )}
          </div>
          {gameState?.hearts_broken && (
            <span className="text-red-400 text-xs font-display">♥ Hearts broken</span>
          )}
        </div>

        {/* Main content: table + sidebar */}
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ── Game table area ── */}
          <div className="flex-1 flex flex-col min-w-0 p-2 sm:p-4 gap-2 relative">

            {/* HUD Widget – top-left corner */}
            {localPlayer && (
              <div className="absolute top-2 left-2 z-10">
                <HUDWidget
                  player={localPlayer}
                  onClick={() => setIsHistoryOpen((prev) => !prev)}
                  isHistoryOpen={isHistoryOpen}
                />
              </div>
            )}

            {/* Top player */}
            <div className="flex justify-center shrink-0">
              <PlayerArea
                player={topPlayer}
                position="top"
                isCurrentTurn={topPlayer?.player_id === currentPlayerId}
                isLocalPlayer={false}
              />
            </div>

            {/* Middle row: left + trick area + right */}
            <div className="flex-1 flex items-center gap-2 min-h-0">

              {/* Left player */}
              <div className="shrink-0">
                <PlayerArea
                  player={leftPlayer}
                  position="left"
                  isCurrentTurn={leftPlayer?.player_id === currentPlayerId}
                  isLocalPlayer={false}
                />
              </div>

              {/* Central trick area */}
              <div className="flex-1 flex items-center justify-center min-h-0 relative">
                <TrickArea
                  cardsPlayed={gameState?.current_trick?.cards_played}
                  players={players}
                  trickWinnerId={trickWinnerId}
                  localSeat={localSeat}
                />
              </div>

              {/* Right player */}
              <div className="shrink-0">
                <PlayerArea
                  player={rightPlayer}
                  position="right"
                  isCurrentTurn={rightPlayer?.player_id === currentPlayerId}
                  isLocalPlayer={false}
                />
              </div>
            </div>

            {/* Bottom player (local) */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <PlayerArea
                player={bottomPlayer}
                position="bottom"
                isCurrentTurn={bottomPlayer?.player_id === currentPlayerId}
                isLocalPlayer={true}
              />
              {/* Local player hand */}
              {bottomPlayer && gameState && (
                <PlayerHand
                  hand={bottomPlayer.hand}
                  legalPlays={bottomPlayer.hand}
                  phase={gameState.phase}
                  selectedCards={selectedCards}
                  onPlayCard={handlePlayCard}
                  onTogglePassCard={handleTogglePassCard}
                  onConfirmPass={handleConfirmPass}
                  isMyTurn={bottomPlayer.player_id === currentPlayerId}
                />
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-56 sm:w-64 shrink-0 flex flex-col gap-2 p-2 border-l border-gold/20 bg-marble/50 overflow-hidden">
            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatBox tableId={tableId ?? ''} onSendMessage={handleSendChat} />
            </div>

            {/* Quick chat */}
            <div className="shrink-0">
              <QuickChatMenu onSelectPreset={handleQuickChat} />
            </div>

            {/* Push to talk */}
            <div className="shrink-0 flex justify-center py-1">
              <PushToTalkButton
                isMicActive={isMicActive}
                micPermissionDenied={micPermissionDenied}
                onStartTalking={startTalking}
                onStopTalking={stopTalking}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── History panel ── */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        trickHistory={trickHistory}
        players={players}
      />

      {/* ── Round end overlay ── */}
      {roundScores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-marble-dark border border-gold rounded-xl p-6 shadow-gold-lg min-w-[240px]">
            <h2 className="text-gold font-display font-bold text-lg text-center mb-4 tracking-wide">Round Over</h2>
            <div className="flex flex-col gap-2">
              {Object.entries(roundScores).map(([pid, score]) => {
                const name = players.find((p) => p.player_id === pid)?.username ?? pid
                return (
                  <div key={pid} className="flex justify-between items-center text-sm">
                    <span className="text-gray-200 font-display">{name}</span>
                    <span className="text-yellow-300 font-bold font-mono">{score} pts</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Game end overlay ── */}
      {finalScores && gameWinners && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <ScoreBoard
            players={players.map((p) => ({ ...p, cumulative_score: finalScores[p.player_id] ?? p.cumulative_score }))}
            mode="end-game"
            winners={gameWinners}
            rematchReadyCount={undefined}
            rematchTotal={4}
            onRematch={handleRematch}
          />
        </div>
      )}
    </div>
  )
}
