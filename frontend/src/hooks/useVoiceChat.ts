import { useState, useEffect, useRef, useCallback } from 'react'

interface UseVoiceChatOptions {
  tableId: string
  localPlayerId: string
  peerPlayerIds: string[]  // other 3 players
  sendSignal: (to: string, signal: object) => void  // sends rtc_signal via WebSocket
  onSignal: (handler: (from: string, signal: RTCSignalMessage) => void) => () => void  // registers handler, returns cleanup
}

interface UseVoiceChatReturn {
  isMicActive: boolean
  micPermissionDenied: boolean
  startTalking: () => void
  stopTalking: () => void
}

export interface RTCSignalMessage {
  type: 'offer' | 'answer' | 'candidate'
  sdp?: string
  candidate?: RTCIceCandidateInit
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export function useVoiceChat(options: UseVoiceChatOptions): UseVoiceChatReturn {
  const { localPlayerId, peerPlayerIds, sendSignal, onSignal } = options

  const [isMicActive, setIsMicActive] = useState(false)
  const [micPermissionDenied, setMicPermissionDenied] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  // Get local audio track (muted by default)
  const getLocalTrack = useCallback((): MediaStreamTrack | null => {
    const stream = streamRef.current
    if (!stream) return null
    const tracks = stream.getAudioTracks()
    return tracks.length > 0 ? tracks[0] : null
  }, [])

  // Create a peer connection for a given peer
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(RTC_CONFIG)

      // Add local audio track if available
      const track = getLocalTrack()
      const stream = streamRef.current
      if (track && stream) {
        pc.addTrack(track, stream)
      }

      // ICE candidate exchange
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, {
            type: 'candidate',
            candidate: event.candidate.toJSON(),
          })
        }
      }

      // Play incoming remote audio
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0]
        if (remoteStream) {
          const audio = new Audio()
          audio.srcObject = remoteStream
          audio.autoplay = true
        }
      }

      peerConnectionsRef.current.set(peerId, pc)
      return pc
    },
    [getLocalTrack, sendSignal]
  )

  // Initiate offers to all peers (called after mic is acquired)
  const initiateConnections = useCallback(async () => {
    for (const peerId of peerPlayerIds) {
      if (peerConnectionsRef.current.has(peerId)) continue

      const pc = createPeerConnection(peerId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal(peerId, { type: 'offer', sdp: offer.sdp })
      } catch (err) {
        console.error(`[useVoiceChat] Failed to create offer for ${peerId}:`, err)
      }
    }
  }, [peerPlayerIds, createPeerConnection, sendSignal])

  // Handle incoming RTC signals
  const handleSignal = useCallback(
    async (from: string, signal: RTCSignalMessage) => {
      if (signal.type === 'offer') {
        let pc = peerConnectionsRef.current.get(from)
        if (!pc) {
          pc = createPeerConnection(from)
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendSignal(from, { type: 'answer', sdp: answer.sdp })
        } catch (err) {
          console.error(`[useVoiceChat] Failed to handle offer from ${from}:`, err)
        }
      } else if (signal.type === 'answer') {
        const pc = peerConnectionsRef.current.get(from)
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }))
          } catch (err) {
            console.error(`[useVoiceChat] Failed to handle answer from ${from}:`, err)
          }
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        const pc = peerConnectionsRef.current.get(from)
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
          } catch (err) {
            console.error(`[useVoiceChat] Failed to add ICE candidate from ${from}:`, err)
          }
        }
      }
    },
    [createPeerConnection, sendSignal]
  )

  // Mount: request mic permission and set up signal handler
  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        // Mute by default
        stream.getAudioTracks().forEach((t) => { t.enabled = false })
        streamRef.current = stream

        await initiateConnections()
      } catch {
        if (!cancelled) {
          setMicPermissionDenied(true)
        }
      }
    }

    setup()

    // Register signal handler
    const unregister = onSignal(handleSignal)

    return () => {
      cancelled = true
      unregister()

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()

      // Stop media stream
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPlayerId])

  const startTalking = useCallback(() => {
    const track = getLocalTrack()
    if (track) {
      track.enabled = true
    }
    setIsMicActive(true)
  }, [getLocalTrack])

  const stopTalking = useCallback(() => {
    const track = getLocalTrack()
    if (track) {
      track.enabled = false
    }
    setIsMicActive(false)
  }, [getLocalTrack])

  return { isMicActive, micPermissionDenied, startTalking, stopTalking }
}
