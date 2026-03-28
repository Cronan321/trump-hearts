import { useState } from 'react'

const QUICK_CHAT_PRESETS = [
  { id: 1, text: 'Wrong! Totally wrong!' },
  { id: 2, text: "That's a beautiful card, believe me." },
  { id: 3, text: 'Nobody plays Hearts better than me.' },
  { id: 4, text: "You're fired!" },
  { id: 5, text: 'Sad! Very sad play.' },
  { id: 6, text: 'Make this table great again!' },
  { id: 7, text: "That's what I call a deal!" },
  { id: 8, text: 'Tremendous! Just tremendous.' },
]

interface QuickChatMenuProps {
  onSelectPreset: (messageId: number) => void
}

export default function QuickChatMenu({ onSelectPreset }: QuickChatMenuProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(id: number) {
    onSelectPreset(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-1.5 text-xs font-semibold font-display rounded border border-gold bg-gold/10 text-gold hover:bg-gold/20 transition-colors tracking-wide"
      >
        ⚡ Quick Chat
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-marble-dark border border-gold/40 rounded-lg shadow-gold overflow-hidden">
          <div className="px-2 py-1.5 border-b border-gold/20">
            <span className="text-gold text-[10px] font-display font-bold tracking-widest uppercase">
              Trump Quotes
            </span>
          </div>
          <div className="flex flex-col">
            {QUICK_CHAT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                className="text-left px-3 py-2 text-xs text-gray-200 hover:bg-gold/10 hover:text-gold transition-colors border-b border-gold/10 last:border-b-0 leading-snug"
              >
                <span className="text-gold/50 font-mono mr-1.5">{preset.id}.</span>
                {preset.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
