export type AgentInfo = {
  id: string
  label: string
}

export const AGENTS: Record<string, AgentInfo> = {
  rio: { id: '1e171fee-c39d-4848-a6fd-2e658a442ff0', label: 'RIO' },
}

export const ELEVENLABS_AGENTS: Record<string, AgentInfo> = {
  rio: { id: 'agent_1101k5skt77qetsstmz8x7j9t5pv', label: 'RIO (ElevenLabs)' },
}

function createLookup(map: Record<string, AgentInfo>) {
  return Object.fromEntries(
    Object.entries(map).map(([key, info]) => [key.toLowerCase(), info]),
  ) as Record<string, AgentInfo>
}

export const VAPI_LOOKUP = createLookup(AGENTS)
export const ELEVENLABS_LOOKUP = createLookup(ELEVENLABS_AGENTS)

export function resolveAgentKey(payload: string): string | null {
  if (!payload) return null

  const trimmed = payload.trim()

  try {
    if (trimmed.startsWith('talkiewalkie://')) {
      const segment = trimmed.split('/').pop()
      return segment?.trim() || null
    }

    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && 'agent' in parsed) {
        const value = String(parsed.agent ?? '').trim()
        return value || null
      }
      return null
    }
  } catch (error) {
    console.warn('Failed to parse QR payload as JSON', error)
    return null
  }

  return trimmed
}

export function getAgentByKey(lookup: Record<string, AgentInfo>, key: string | null): AgentInfo | null {
  if (!key) return null
  const normalized = key.trim().toLowerCase()
  if (!normalized) return null
  return lookup[normalized] ?? null
}
