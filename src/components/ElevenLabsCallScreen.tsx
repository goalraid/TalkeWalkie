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

type StatusChangePayload = {
  status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
}

type ErrorPayload = {
  message: string
}

export const ElevenLabsCallScreen: React.FC<CallScreenProps> = ({ agentId, label, onBack }) => {
  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const statusRef = React.useRef<CallStatus>('idle')
  const hasStartedRef = React.useRef(false)

  React.useEffect(() => {
    statusRef.current = status
  }, [status])

  const ensureMicrophonePermission = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.')
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
  }, [])

  const handleStatusChange = React.useCallback(({ status }: StatusChangePayload) => {
    if (status === 'connected') {
      setStatus('live')
    }
    if (status === 'disconnecting' || status === 'disconnected') {
      setStatus('ended')
      hasStartedRef.current = false
    }
  }, [])

  const handleDisconnect = React.useCallback(() => {
    setStatus('ended')
    hasStartedRef.current = false
  }, [])

  const handleError = React.useCallback((messageOrPayload: string | ErrorPayload) => {
    const message = typeof messageOrPayload === 'string' ? messageOrPayload : messageOrPayload?.message
    setStatus('error')
    setError(message || 'ElevenLabs conversation error')
    hasStartedRef.current = false
  }, [])

  const conversation = useConversation(
    React.useMemo(
      () => ({
        onStatusChange: handleStatusChange,
        onDisconnect: handleDisconnect,
        onError: handleError,
      }),
      [handleStatusChange, handleDisconnect, handleError],
    ),
  )

  const startSession = React.useCallback(async () => {
    if (hasStartedRef.current || statusRef.current === 'live') return

    if (!ELEVENLABS_API_KEY) {
      setError('Missing ElevenLabs API key. Set VITE_ELEVENLABS_API_KEY and reload.')
      setStatus('error')
      return
    }

    setError(null)
    setStatus('connecting')
    hasStartedRef.current = true

    try {
      await ensureMicrophonePermission()
      await conversation.startSession({
        agentId,
        connectionType: 'webrtc',
        authorization: ELEVENLABS_API_KEY,
      })
    } catch (err) {
      console.error('[ElevenLabsCallScreen] Failed to start session', err)
      const message = err instanceof Error ? err.message : 'Could not start the ElevenLabs conversation.'
      setError(message)
      setStatus('error')
      hasStartedRef.current = false
    }
  }, [agentId, conversation, ensureMicrophonePermission])

  const endSession = React.useCallback(() => {
    conversation.endSession().catch((err) => {
      console.warn('[ElevenLabsCallScreen] Failed to end session', err)
    })
    setStatus('ended')
    hasStartedRef.current = false
  }, [conversation])

  React.useEffect(() => {
    startSession().catch(() => {
      /* handled above */
    })

    return () => {
      conversation.endSession().catch((err) => {
        console.warn('[ElevenLabsCallScreen] endSession on unmount failed', err)
      })
    }
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
    ? 'Mic live — speak freely'
    : status === 'connecting'
      ? 'Mic will activate once connected'
      : 'Mic idle'

  return (
    <section className="call-screen">
      <header className="call-screen__header">
        <button
          type="button"
          className="call-screen__back"
          onClick={() => {
            endSession()
            onBack()
          }}
        >
          Back to Scanner
        </button>
      </header>

      <div className="call-screen__content">
        <h2 className="call-screen__title">Agent: {label}</h2>
        <p className="call-screen__status">Status: {statusLabel}</p>
        <p className="call-screen__microphone">{microphoneMessage}</p>

        {error ? <p className="call-screen__error">{error}</p> : null}

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
