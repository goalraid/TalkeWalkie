import React from 'react'
import { Scanner } from './components/Scanner'
import { CallScreen } from './components/CallScreen'
import { getAgentByKey, resolveAgentKey } from './agentMap'
import type { AgentInfo } from './agentMap'

function App() {
  const [stage, setStage] = React.useState<'scanning' | 'resolving' | 'call'>('scanning')
  const [agent, setAgent] = React.useState<AgentInfo | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [scannerError, setScannerError] = React.useState<string | null>(null)
  const [scannerResetToken, setScannerResetToken] = React.useState(0)

  const restartScanner = React.useCallback((clearMessage: boolean = true) => {
    setStage('scanning')
    setAgent(null)
    setScannerError(null)
    if (clearMessage) {
      setMessage(null)
    }
    setScannerResetToken((value) => value + 1)
  }, [])

  const handleDetection = React.useCallback(
    (payload: string) => {
      setStage('resolving')
      setMessage(null)

      const key = resolveAgentKey(payload)
      if (!key) {
        setMessage('Could not read this QR code. Please try again.')
        restartScanner(false)
        return
      }

      const info = getAgentByKey(key)
      if (!info) {
        setMessage('Unknown agent. Please scan a TalkieWalkie QR.')
        restartScanner(false)
        return
      }

      setAgent(info)
      setStage('call')
    },
    [restartScanner],
  )

  const handleScannerError = React.useCallback((msg: string) => {
    setScannerError(msg)
  }, [])

  return (
    <main className={'app app--' + stage}>
      <header className="app__header">
        <h1 className="app__title">TalkieWalkie</h1>
        <p className="app__subtitle">Scan a code to talk instantly.</p>
      </header>

      {stage === 'call' && agent ? (
        <CallScreen assistantId={agent.id} label={agent.label} onBack={() => restartScanner()} />
      ) : (
        <section className="scanner-section">
          {stage === 'resolving' ? (
            <div className="scanner-section__message">Resolving agent…</div>
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
                Need a code? Try <strong>Rio</strong>.
              </p>
            </>
          )}
        </section>
      )}
    </main>
  )
}

export default App
