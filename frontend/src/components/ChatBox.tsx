import { useEffect, useRef, useState } from 'react'
import { useChatStore } from '../store/chatStore'

const MAX_CHARS = 280

interface ChatBoxProps {
  tableId: string
  onSendMessage: (text: string) => void
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export default function ChatBox({ tableId: _tableId, onSendMessage }: ChatBoxProps) {
  const messages = useChatStore((s) => s.messages)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const remaining = MAX_CHARS - input.length
  const isOverLimit = remaining < 0
  const canSend = input.trim().length > 0 && !isOverLimit

  function handleSend() {
    if (!canSend) return
    onSendMessage(input.trim())
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-marble border border-gold/40 rounded-lg overflow-hidden shadow-gold">
      {/* Header */}
      <div className="px-3 py-2 bg-marble-dark border-b border-gold/30 flex items-center gap-2">
        <span className="text-gold text-xs font-display font-bold tracking-widest uppercase">
          Table Chat
        </span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-500 text-xs italic text-center mt-4">No messages yet.</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-gold text-xs font-semibold font-display truncate max-w-[120px]">
                {msg.sender}
              </span>
              <span className="text-gray-500 text-[10px] shrink-0">{formatTime(msg.timestamp)}</span>
            </div>
            <p className="text-gray-200 text-sm leading-snug break-words">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gold/30 px-3 py-2 bg-marble-dark flex flex-col gap-1">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            maxLength={MAX_CHARS + 50} // allow typing past limit to show warning
            className={`flex-1 bg-marble border rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors ${
              isOverLimit
                ? 'border-red-500 focus:border-red-400'
                : 'border-gold/40 focus:border-gold'
            }`}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-gold bg-gold/10 text-gold hover:bg-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        {/* Character counter / warning */}
        <div className="flex justify-end">
          {isOverLimit ? (
            <span className="text-red-400 text-[10px] font-semibold">
              Message too long ({-remaining} over limit)
            </span>
          ) : (
            <span className={`text-[10px] ${remaining <= 30 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {remaining}/{MAX_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
