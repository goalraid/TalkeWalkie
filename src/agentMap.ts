export type AgentInfo = {
  id: string
  label: string
}

export const AGENTS: Record<string, AgentInfo> = {
  rio: { id: '1e171fee-c39d-4848-a6fd-2e658a442ff0', label: 'RIO' },
}

const AGENT_LOOKUP = Object.fromEntries(
  Object.entries(AGENTS).map(([key, info]) => [key.toLowerCase(), info]),
) as Record<string, AgentInfo>

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

export function getAgentByKey(key: string | null): AgentInfo | null {
  if (!key) return null
  const normalized = key.trim().toLowerCase()
  if (!normalized) return null
  return AGENT_LOOKUP[normalized] ?? null
}
