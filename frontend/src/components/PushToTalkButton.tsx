import { useEffect, useRef } from 'react'

interface PushToTalkButtonProps {
  isMicActive: boolean
  micPermissionDenied: boolean
  onStartTalking: () => void
  onStopTalking: () => void
  hotkey?: string // default "Space"
}

export default function PushToTalkButton({
  isMicActive,
  micPermissionDenied,
  onStartTalking,
  onStopTalking,
  hotkey = 'Space',
}: PushToTalkButtonProps) {
  const isHotkeyDownRef = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== hotkey) return
      if (e.repeat) return
      if (micPermissionDenied) return
      if (isHotkeyDownRef.current) return
      isHotkeyDownRef.current = true
      onStartTalking()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== hotkey) return
      if (!isHotkeyDownRef.current) return
      isHotkeyDownRef.current = false
      onStopTalking()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [hotkey, micPermissionDenied, onStartTalking, onStopTalking])

  const hotkeyLabel = hotkey === 'Space' ? 'SPACE' : hotkey

  // Determine button visual state
  const buttonClasses = (() => {
    const base =
      'relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] w-20 h-20 rounded-full font-display font-bold text-xs tracking-wide select-none transition-all duration-150 focus:outline-none'

    if (micPermissionDenied) {
      return `${base} bg-gray-700 border-2 border-gray-500 text-gray-400 cursor-not-allowed opacity-60`
    }

    if (isMicActive) {
      return `${base} bg-red-900/80 border-2 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse cursor-pointer`
    }

    return `${base} bg-marble-light border-2 border-gold text-gold shadow-gold hover:shadow-gold-lg hover:bg-gold/10 active:scale-95 cursor-pointer`
  })()

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Denied tooltip */}
      {micPermissionDenied && (
        <div className="text-[10px] text-red-400 bg-marble-dark border border-red-500/40 rounded px-2 py-1 text-center max-w-[160px] leading-snug">
          Microphone access denied. Voice chat unavailable.
        </div>
      )}

      <button
        className={buttonClasses}
        disabled={micPermissionDenied}
        onMouseDown={micPermissionDenied ? undefined : onStartTalking}
        onMouseUp={micPermissionDenied ? undefined : onStopTalking}
        onMouseLeave={micPermissionDenied ? undefined : onStopTalking}
        onTouchStart={
          micPermissionDenied
            ? undefined
            : (e) => {
                e.preventDefault()
                onStartTalking()
              }
        }
        onTouchEnd={
          micPermissionDenied
            ? undefined
            : (e) => {
                e.preventDefault()
                onStopTalking()
              }
        }
        aria-label={
          micPermissionDenied
            ? 'Microphone access denied'
            : isMicActive
              ? 'Talking — release to stop'
              : `Push to talk (${hotkeyLabel})`
        }
        aria-pressed={isMicActive}
      >
        <span className="text-2xl leading-none">{isMicActive ? '🎙️' : '🎤'}</span>
        {isMicActive && (
          <span className="text-[10px] font-semibold mt-0.5 text-red-200">Talking...</span>
        )}
      </button>

      {/* Hotkey hint */}
      {!micPermissionDenied && !isMicActive && (
        <span className="text-[10px] text-gold/50 font-display tracking-widest uppercase">
          Hold {hotkeyLabel}
        </span>
      )}
    </div>
  )
}
