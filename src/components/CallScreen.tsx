import React from 'react'
import { vapi } from '../vapi'

type CallStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

type CallScreenProps = {
  assistantId: string
  onBack?: () => void
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
}

export const CallScreen: React.FC<CallScreenProps> = ({ assistantId, onBack }) => {
  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const statusRef = React.useRef<CallStatus>('idle')
  const videoRef = React.useRef<HTMLVideoElement | null>(null)

  React.useEffect(() => {
    statusRef.current = status
  }, [status])

  const startCall = React.useCallback(async () => {
    if (statusRef.current === 'connecting' || statusRef.current === 'live') {
      return
    }

    setError(null)
    setStatus('connecting')

    try {
      await requestMicrophonePermission()
      await vapi.start(assistantId)
    } catch (err) {
      console.error('[CallScreen] Failed to start call', err)
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Could not start the call.'
      setError(message)
    }
  }, [assistantId])

  const endCall = React.useCallback(() => {
    try {
      vapi.stop()
    } finally {
      setStatus('ended')
    }
  }, [])

  React.useEffect(() => {
    const handleCallStart = () => setStatus('live')
    const handleCallStartSuccess = () => setStatus('live')
    const handleCallEnd = () => setStatus('ended')
    const handleCallStartFailed = (event: unknown) => {
      console.error('[CallScreen] call-start-failed', event)
      setStatus('error')
      setError('Unable to connect to the assistant. Please try again.')
    }
    const handleError = (event: unknown) => {
      console.error('[CallScreen] error event', event)
      setStatus('error')
      setError('A call error occurred. Please try again.')
    }

    vapi.on('call-start', handleCallStart)
    vapi.on('call-start-success', handleCallStartSuccess)
    vapi.on('call-end', handleCallEnd)
    vapi.on('call-start-failed', handleCallStartFailed)
    vapi.on('error', handleError)

    return () => {
      vapi.removeListener('call-start', handleCallStart)
      vapi.removeListener('call-start-success', handleCallStartSuccess)
      vapi.removeListener('call-end', handleCallEnd)
      vapi.removeListener('call-start-failed', handleCallStartFailed)
      vapi.removeListener('error', handleError)
    }
  }, [])

  React.useEffect(() => {
    startCall().catch(() => {
      /* handled inside startCall */
    })

    return () => {
      try {
        vapi.stop()
      } catch (err) {
        console.warn('[CallScreen] failed to stop call on unmount', err)
      }
    }
  }, [startCall])

  const isLive = status === 'live'
  const isConnecting = status === 'connecting'
  const isError = status === 'error'

  const statusLabel =
    status === 'live'
      ? 'Live'
      : status === 'connecting'
        ? 'Connecting...'
        : status === 'idle'
          ? 'Idle'
          : status === 'ended'
            ? 'Ended'
            : 'Error'

  const showConnectingVideo = status !== 'live' && status !== 'error'
  const showBackButton = typeof onBack === 'function'

  React.useEffect(() => {
    if (showConnectingVideo) {
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        void video.play().catch(() => {})
      }
    }
  }, [showConnectingVideo])

  return (
    <section className="call-screen">
      {showBackButton ? (
        <header className="call-screen__header">
          <button
            type="button"
            className="call-screen__back"
            onClick={() => {
              try {
                vapi.stop()
              } finally {
                onBack?.()
              }
            }}
          >
            Back
          </button>
        </header>
      ) : null}

      <div className="call-screen__content">
        <h2 className="call-screen__title">Say hello to Banya</h2>
        <p className="call-screen__status">Status: {statusLabel}</p>

        {error ? <p className="call-screen__error">{error}</p> : null}

        {showConnectingVideo ? (
          <video
            key={assistantId}
            ref={videoRef}
            className="call-screen__video-preview"
            src="/banya-loop.mp4"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        ) : null}

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
          {isLive ? 'End Call' : isConnecting ? 'Connecting...' : isError ? 'Retry Call' : 'Start Call'}
        </button>
      </div>
    </section>
  )
}
