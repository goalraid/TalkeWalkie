import React from 'react'
import { vapi } from '../vapi'

type CallStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

type CallScreenProps = {
  assistantId: string
  label: string
  onBack: () => void
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
}

export const CallScreen: React.FC<CallScreenProps> = ({ assistantId, label, onBack }) => {
  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const statusRef = React.useRef<CallStatus>('idle')
  const [isHolding, setIsHolding] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(true)

  const applyMuteState = React.useCallback((mute: boolean) => {
    try {
      vapi.setMuted(mute)
      setIsMuted(mute)
    } catch (err) {
      const mode = mute ? 'mute' : 'unmute'
      console.error('[CallScreen] failed to ' + mode + ' microphone', err)
    }
  }, [])

  React.useEffect(() => {
    statusRef.current = status
    if (status !== 'live') {
      setIsHolding(false)
    }
  }, [status])

  const startCall = React.useCallback(async () => {
    if (statusRef.current === 'connecting' || statusRef.current === 'live') return

    setError(null)
    setStatus('connecting')

    try {
      await requestMicrophonePermission()
      await vapi.start(assistantId)
      applyMuteState(true)
    } catch (err) {
      console.error('[CallScreen] Failed to start call', err)
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Could not start the call.'
      setError(message)
      applyMuteState(true)
    }
  }, [assistantId, applyMuteState])

  const endCall = React.useCallback(() => {
    try {
      vapi.stop()
    } finally {
      applyMuteState(true)
      setIsHolding(false)
      setStatus('ended')
    }
  }, [applyMuteState])

  const handleHoldStart = React.useCallback(() => {
    if (statusRef.current !== 'live' || isHolding) return
    setIsHolding(true)
    applyMuteState(false)
  }, [applyMuteState, isHolding])

  const handleHoldEnd = React.useCallback(() => {
    if (!isHolding) return
    setIsHolding(false)
    applyMuteState(true)
  }, [applyMuteState, isHolding])

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
    const handleCallStart = () => {
      setStatus('live')
      setIsHolding(false)
      applyMuteState(true)
    }
    const handleCallEnd = () => {
      setStatus('ended')
      setIsHolding(false)
      applyMuteState(true)
    }
    const handleCallStartFailed = (event: unknown) => {
      console.error('[CallScreen] call-start-failed', event)
      setStatus('error')
      setIsHolding(false)
      applyMuteState(true)
      setError('Unable to connect to the assistant. Please try again.')
    }
    const handleError = (event: unknown) => {
      console.error('[CallScreen] error event', event)
      setStatus('error')
      setIsHolding(false)
      applyMuteState(true)
      setError('A call error occurred. Please try again.')
    }

    vapi.on('call-start', handleCallStart)
    vapi.on('call-end', handleCallEnd)
    vapi.on('call-start-failed', handleCallStartFailed)
    vapi.on('error', handleError)

    return () => {
      vapi.removeListener('call-start', handleCallStart)
      vapi.removeListener('call-end', handleCallEnd)
      vapi.removeListener('call-start-failed', handleCallStartFailed)
      vapi.removeListener('error', handleError)
    }
  }, [applyMuteState])

  React.useEffect(() => {
    startCall().catch(() => {
      /* error handled inside startCall */
    })

    return () => {
      try {
        vapi.stop()
      } catch (err) {
        console.warn('[CallScreen] failed to stop call on unmount', err)
      }
      applyMuteState(true)
      setIsHolding(false)
    }
  }, [startCall, applyMuteState])

  const isLive = status === 'live'
  const isConnecting = status === 'connecting'
  const isError = status === 'error'

  const statusLabel =
    status === 'live'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting…'
        : status === 'idle'
          ? 'Idle'
          : status === 'ended'
            ? 'Ended'
            : 'Error'

  const microphoneMessage = isLive
    ? isMuted
      ? 'Mic muted — hold the button to speak'
      : 'Mic live — release to mute'
    : status === 'connecting'
      ? 'Mic will stay muted until connected'
      : 'Mic muted'

  const microphoneClasses =
    'call-screen__microphone' + (isLive && !isMuted ? ' call-screen__microphone--open' : '')

  const pushToTalkClasses =
    'call-screen__push-to-talk' + (isLive && !isMuted ? ' call-screen__push-to-talk--active' : '')

  const pushToTalkLabel = isLive ? (isMuted ? 'Hold to Talk' : 'Release to Mute') : 'Hold to Talk'

  return (
    <section className="call-screen">
      <header className="call-screen__header">
        <button
          type="button"
          className="call-screen__back"
          onClick={() => {
            try {
              handleHoldEnd()
              vapi.stop()
            } finally {
              applyMuteState(true)
              onBack()
            }
          }}
        >
          ← Back to Scanner
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
            aria-pressed={isLive && !isMuted}
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
              endCall()
            } else {
              startCall().catch(() => {
                /* already handled inside startCall */
              })
            }
          }}
          disabled={isConnecting}
        >
          {isLive ? 'End Call' : isConnecting ? 'Connecting…' : isError ? 'Retry Call' : 'Start Call'}
        </button>
      </div>
    </section>
  )
}
