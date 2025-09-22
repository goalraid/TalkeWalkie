import React from 'react'
import { useConversation } from '@elevenlabs/react'

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY

if (!ELEVENLABS_API_KEY) {
  console.warn('VITE_ELEVENLABS_API_KEY is not set. ElevenLabs calls will fail until it is provided.')
}

type CallStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

type CallScreenProps = {
  agentId: string
  label: string
  onBack: () => void
}

async function ensureMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
}

export const ElevenLabsCallScreen: React.FC<CallScreenProps> = ({ agentId, label, onBack }) => {
  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [isHolding, setIsHolding] = React.useState(false)
  const [isMicMuted, setIsMicMuted] = React.useState(true)
  const statusRef = React.useRef<CallStatus>('idle')

  const conversation = useConversation({
    micMuted: isMicMuted,
    onStatusChange: ({ status }) => {
      if (status === 'connected') {
        setStatus('live')
      }
      if (status === 'disconnecting' || status === 'disconnected') {
        setStatus('ended')
        setIsHolding(false)
        setIsMicMuted(true)
      }
    },
    onDisconnect: () => {
      setStatus('ended')
      setIsHolding(false)
      setIsMicMuted(true)
    },
    onError: (message) => {
      console.error('[ElevenLabsCallScreen] conversation error', message)
      setStatus('error')
      setError(message)
      setIsHolding(false)
      setIsMicMuted(true)
    },
  })

  React.useEffect(() => {
    statusRef.current = status
  }, [status])

  const startSession = React.useCallback(async () => {
    if (statusRef.current === 'connecting' || statusRef.current === 'live') return

    if (!ELEVENLABS_API_KEY) {
      setError('Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY and reload.')
      setStatus('error')
      return
    }

    setError(null)
    setStatus('connecting')

    try {
      await ensureMicrophonePermission()
      await conversation.startSession({
        agentId,
        connectionType: 'webrtc',
        authorization: `Bearer ${ELEVENLABS_API_KEY}`,
      })
      setIsMicMuted(true)
      setStatus('live')
    } catch (err) {
      console.error('[ElevenLabsCallScreen] Failed to start session', err)
      const message = err instanceof Error ? err.message : 'Could not start the ElevenLabs conversation.'
      setError(message)
      setStatus('error')
      setIsMicMuted(true)
    }
  }, [agentId, conversation])

  const endSession = React.useCallback(() => {
    conversation.endSession().catch((err) => {
      console.warn('[ElevenLabsCallScreen] Failed to end session', err)
    })
    setStatus('ended')
    setIsHolding(false)
    setIsMicMuted(true)
  }, [conversation])

  const handleHoldStart = React.useCallback(() => {
    if (statusRef.current !== 'live' || isHolding) return
    setIsHolding(true)
    setIsMicMuted(false)
  }, [isHolding])

  const handleHoldEnd = React.useCallback(() => {
    if (!isHolding) return
    setIsHolding(false)
    setIsMicMuted(true)
  }, [isHolding])

  const handleHoldKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.repeat) return
      if (event.key === ' ' || event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        handleHoldStart()
      }
    },
    [handleHoldStart],
  )

  const handleHoldKeyUp = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault()
        handleHoldEnd()
      }
    },
    [handleHoldEnd],
  )

  React.useEffect(() => {
    startSession().catch(() => {
      /* handled above */
    })

    return () => {
      handleHoldEnd()
      conversation.endSession().catch((err) => {
        console.warn('[ElevenLabsCallScreen] endSession on unmount failed', err)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSession, conversation])

  const isLive = status === 'live'
  const isConnecting = status === 'connecting'
  const isError = status === 'error'

  const statusLabel =
    status === 'live'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting...'
        : status === 'ended'
          ? 'Ended'
          : status === 'error'
            ? 'Error'
            : 'Idle'

  const microphoneMessage = isLive
    ? isMicMuted
      ? 'Mic muted â€” hold the button to speak'
      : 'Mic live â€” release to mute'
    : status === 'connecting'
      ? 'Mic will stay muted until connected'
      : 'Mic muted'

  const microphoneClasses =
    'call-screen__microphone' + (isLive && !isMicMuted ? ' call-screen__microphone--open' : '')

  const pushToTalkClasses =
    'call-screen__push-to-talk' + (isLive && !isMicMuted ? ' call-screen__push-to-talk--active' : '')

  const pushToTalkLabel = isLive ? (isMicMuted ? 'Hold to Talk' : 'Release to Mute') : 'Hold to Talk'

  return (
    <section className="call-screen">
      <header className="call-screen__header">
        <button
          type="button"
          className="call-screen__back"
          onClick={() => {
            handleHoldEnd()
            conversation.endSession().catch(() => {
              /* ignore */
            })
            onBack()
          }}
        >
          Back to Scanner
        </button>
      </header>

      <div className="call-screen__content">
        <h2 className="call-screen__title">Agent: {label}</h2>
        <p className="call-screen__status">Status: {statusLabel}</p>
        <p className={microphoneClasses}>{microphoneMessage}</p>

        {error ? <p className="call-screen__error">{error}</p> : null}

        <div className="call-screen__talk-area">
          <button
            type="button"
            className={pushToTalkClasses}
            disabled={!isLive}
            aria-pressed={isLive && !isMicMuted}
            onPointerDown={(event) => {
              event.preventDefault()
              handleHoldStart()
            }}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            onPointerCancel={handleHoldEnd}
            onBlur={handleHoldEnd}
            onKeyDown={handleHoldKeyDown}
            onKeyUp={handleHoldKeyUp}
          >
            {pushToTalkLabel}
          </button>
        </div>

        <button
          type="button"
          className="call-screen__primary"
          onClick={() => {
            if (isLive) {
              endSession()
            } else {
              startSession().catch(() => {
                /* handled in startSession */
              })
            }
          }}
          disabled={isConnecting}
        >
          {isLive ? 'End Call' : isConnecting ? 'Connecting...' : isError ? 'Retry Call' : 'Start Call'}
        </button>
      </div>
    </section>
  )
}
