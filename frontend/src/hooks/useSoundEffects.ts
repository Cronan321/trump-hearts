interface UseSoundEffectsReturn {
  playCardSound: () => void
  playTrickWinSound: () => void
  playGameEndSound: () => void
  playShootTheMoonSound: () => void
}

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    return audioCtx
  } catch {
    return null
  }
}

function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  ctx: AudioContext,
  type: OscillatorType = 'sine',
  gainValue = 0.3,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(gainValue, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const playCardSound = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      playTone(800, now, 0.05, ctx, 'square', 0.15)
      playTone(400, now + 0.03, 0.07, ctx, 'square', 0.1)
    } catch { /* silently fail */ }
  }

  const playTrickWinSound = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      playTone(440, now,        0.12, ctx, 'sine', 0.25)
      playTone(550, now + 0.1,  0.12, ctx, 'sine', 0.25)
      playTone(660, now + 0.2,  0.18, ctx, 'sine', 0.3)
    } catch { /* silently fail */ }
  }

  const playGameEndSound = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      playTone(523, now,        0.15, ctx, 'sine', 0.3)
      playTone(659, now + 0.12, 0.15, ctx, 'sine', 0.3)
      playTone(784, now + 0.24, 0.15, ctx, 'sine', 0.3)
      playTone(1047, now + 0.36, 0.3, ctx, 'sine', 0.35)
    } catch { /* silently fail */ }
  }

  const playShootTheMoonSound = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [261, 329, 392, 523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        playTone(freq, now + i * 0.07, 0.15, ctx, 'sine', 0.3)
      })
    } catch { /* silently fail */ }
  }

  return { playCardSound, playTrickWinSound, playGameEndSound, playShootTheMoonSound }
}
