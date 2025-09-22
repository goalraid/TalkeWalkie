import Vapi from '@vapi-ai/web'

const apiKey = import.meta.env.VITE_VAPI_PUBLIC_KEY

if (!apiKey) {
  console.warn('VITE_VAPI_PUBLIC_KEY is not set. Vapi calls will fail until it is provided.')
}

export const vapi = new Vapi(apiKey ?? '')

vapi.on('call-start', () => console.log('[Vapi] call starting'))
vapi.on('call-end', () => console.log('[Vapi] call ended'))
vapi.on('error', (err) => console.error('[Vapi] error', err))
