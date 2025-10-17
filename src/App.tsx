import React from 'react'
import { CallScreen } from './components/CallScreen'
import { AGENTS } from './agentMap'

function App() {
  const defaultAgent = React.useMemo(() => {
    if (AGENTS.rio) return AGENTS.rio
    const [firstAgent] = Object.values(AGENTS)
    return firstAgent ?? null
  }, [])

  if (!defaultAgent) {
    return (
      <main className="app app--call">
        <section className="app__empty-state">
          <h1 className="app__empty-title">No agent configured</h1>
          <p className="app__empty-message">
            Add an entry to <code>AGENTS</code> in <code>src/agentMap.ts</code> to enable voice calls.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="app app--call">
      <CallScreen assistantId={defaultAgent.id} />
    </main>
  )
}

export default App
