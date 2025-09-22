import React from 'react'
import { Scanner } from './components/Scanner'
import { CallScreen } from './components/CallScreen'
import { ElevenLabsCallScreen } from './components/ElevenLabsCallScreen'
import {
  ELEVENLABS_LOOKUP,
  VAPI_LOOKUP,
  getAgentByKey,
  resolveAgentKey,
} from './agentMap'
import type { AgentInfo } from './agentMap'

const PERMISSION_UNSUPPORTED = 'unsupported' as const

type PermissionState = 'granted' | 'denied' | 'prompt' | typeof PERMISSION_UNSUPPORTED

type MediaPermissionName = 'camera' | 'microphone'

type MediaPermissionDescriptor = PermissionDescriptor & { name: MediaPermissionName }

type Provider = 'vapi' | 'elevenlabs'

const PROVIDER_LABELS: Record<Provider, string> = {
  vapi: 'Vapi',
  elevenlabs: 'ElevenLabs',
}

function App() {
  const [provider, setProvider] = React.useState<Provider | null>(null)
  const [stage, setStage] = React.useState<'home' | 'scanning' | 'resolving' | 'call'>('home')
  const [agent, setAgent] = React.useState<AgentInfo | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [scannerError, setScannerError] = React.useState<string | null>(null)
  const [scannerResetToken, setScannerResetToken] = React.useState(0)

  const [cameraPermission, setCameraPermission] = React.useState<PermissionState>('prompt')
  const [microphonePermission, setMicrophonePermission] = React.useState<PermissionState>('prompt')
  const [permissionError, setPermissionError] = React.useState<string | null>(null)

  const isPermissionApiSupported = typeof navigator !== 'undefined' && Boolean(navigator.permissions?.query)
  const isMediaDevicesSupported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

  const queryPermission = React.useCallback(async (name: MediaPermissionName) => {
    if (!isPermissionApiSupported) {
      return PERMISSION_UNSUPPORTED as PermissionState
    }

    try {
      const status = await navigator.permissions.query({ name } as MediaPermissionDescriptor)
      return (status.state as PermissionState) ?? 'prompt'
    } catch (error) {
      console.warn(`[Permissions] Failed to query ${name} permission`, error)
      return 'prompt'
    }
  }, [isPermissionApiSupported])

  const refreshPermissions = React.useCallback(async () => {
    const [cameraState, microphoneState] = await Promise.all([
      queryPermission('camera'),
      queryPermission('microphone'),
    ])
    setCameraPermission(cameraState)
    setMicrophonePermission(microphoneState)
  }, [queryPermission])

  const requestMediaPermissions = React.useCallback(async () => {
    if (!isMediaDevicesSupported) {
      setPermissionError('Media devices are not supported in this browser.')
      return
    }

    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      console.error('[Permissions] Failed to obtain media permissions', error)
      const message = error instanceof Error ? error.message : 'Unable to request camera/microphone permissions.'
      setPermissionError(message)
    } finally {
      await refreshPermissions()
    }
  }, [isMediaDevicesSupported, refreshPermissions])

  React.useEffect(() => {
    refreshPermissions().catch((error) => {
      console.warn('[Permissions] Refresh failed', error)
    })
  }, [refreshPermissions])

  const enterProvider = React.useCallback((next: Provider) => {
    setProvider(next)
    setStage('scanning')
    setAgent(null)
    setScannerError(null)
    setMessage(null)
    setScannerResetToken((value) => value + 1)
  }, [])

  const clearProvider = React.useCallback(() => {
    setProvider(null)
    setStage('home')
    setAgent(null)
    setScannerError(null)
    setMessage(null)
  }, [])

  const restartScanner = React.useCallback((clearMessage: boolean = true) => {
    if (!provider) return
    setStage('scanning')
    setAgent(null)
    setScannerError(null)
    if (clearMessage) {
      setMessage(null)
    }
    setScannerResetToken((value) => value + 1)
  }, [provider])

  const handleDetection = React.useCallback((payload: string) => {
    if (!provider) return

    setStage('resolving')
    setMessage(null)

    const key = resolveAgentKey(payload)
    if (!key) {
      setMessage('Could not read this QR code. Please try again.')
      restartScanner(false)
      return
    }

    const lookup = provider === 'elevenlabs' ? ELEVENLABS_LOOKUP : VAPI_LOOKUP
    const info = getAgentByKey(lookup, key)
    if (!info) {
      setMessage('Unknown agent. Please scan a TalkieWalkie QR.')
      restartScanner(false)
      return
    }

    setAgent(info)
    setStage('call')
  }, [provider, restartScanner])

  const handleScannerError = React.useCallback((msg: string) => {
    setScannerError(msg)
  }, [])

  if (!provider || stage === 'home') {
    return (
      <main className="app app--home">
        <header className="app__header">
          <h1 className="app__title">TalkieWalkie</h1>
          <p className="app__subtitle">Choose a voice stack to get started.</p>
        </header>

        <section className="app__selector">
          <p className="app__selector-label">Select a mode</p>
          <div className="app__selector-actions">
            <button type="button" className="app__selector-button" onClick={() => enterProvider('vapi')}>
              Vapi
            </button>
            <button type="button" className="app__selector-button" onClick={() => enterProvider('elevenlabs')}>
              ElevenLabs
            </button>
          </div>
          <p className="app__selector-hint">You can switch providers anytime.</p>
        </section>
      </main>
    )
  }

  const providerLabel = PROVIDER_LABELS[provider]

  return (
    <main className={'app app--' + stage}>
      <header className="app__header">
        <div className="app__header-top">
          <div>
            <h1 className="app__title">TalkieWalkie</h1>
            <p className="app__subtitle">Scan a code to talk instantly.</p>
          </div>
          <div className="app__mode">
            <span className="app__mode-label">Mode: {providerLabel}</span>
            <button type="button" className="app__mode-switch" onClick={clearProvider}>
              Change Mode
            </button>
          </div>
        </div>
      </header>

      <section className="app__permissions">
        <div className="app__permission-actions">
          <button
            type="button"
            className="app__permission-request"
            onClick={() => requestMediaPermissions()}
            disabled={!isMediaDevicesSupported}
          >
            Request Camera &amp; Microphone
          </button>
          <button
            type="button"
            className="app__permission-refresh"
            onClick={() => refreshPermissions()}
            disabled={!isPermissionApiSupported}
          >
            Refresh Status
          </button>
        </div>
        <div className="app__permission-badges">
          <span className={`app__permission-badge app__permission-badge--${cameraPermission}`}>
            Camera: {cameraPermission}
          </span>
          <span className={`app__permission-badge app__permission-badge--${microphonePermission}`}>
            Microphone: {microphonePermission}
          </span>
        </div>
        {permissionError ? <p className="app__permission-error">{permissionError}</p> : null}
        {!isPermissionApiSupported ? (
          <p className="app__permission-note">Permission status checks are not supported in this browser.</p>
        ) : null}
      </section>

      {stage === 'call' && agent ? (
        provider === 'elevenlabs' ? (
          <ElevenLabsCallScreen agentId={agent.id} label={agent.label} onBack={() => restartScanner()} />
        ) : (
          <CallScreen assistantId={agent.id} label={agent.label} onBack={() => restartScanner()} />
        )
      ) : (
        <section className="scanner-section">
          {stage === 'resolving' ? (
            <div className="scanner-section__message">Resolving agent...</div>
          ) : (
            <>
              {scannerError ? (
                <div className="scanner-section__error">
                  <p>{scannerError}</p>
                  <button type="button" onClick={() => restartScanner()}>
                    Retry Scanner
                  </button>
                </div>
              ) : (
                <Scanner
                  key={scannerResetToken}
                  onDetected={handleDetection}
                  onError={handleScannerError}
                />
              )}
              {message ? <p className="scanner-section__message">{message}</p> : null}
              <p className="scanner-section__note">
                Need a code? Try <strong>Rio</strong>. ({providerLabel})
              </p>
            </>
          )}
        </section>
      )}
    </main>
  )
}

export default App
