# TalkieWalkie

TalkieWalkie is a minimal "scan -> talk" web app: scan a QR code, resolve it to a Vapi agent, and immediately jump into a voice session that can be started or ended on demand. It targets mobile browsers (Chrome on Android, Safari on iOS) and desktop cameras.

## Features
- Camera-based QR scanning powered by `@zxing/browser`, with automatic back-camera preference on mobile.
- Flexible QR payload support (`rio`, `talkiewalkie://agent/rio`, `{ "agent": "rio" }`).
- Local agent map that resolves to Vapi assistant IDs (RIO included out of the box).
- Just-in-time microphone permission requests and Start/End Call controls via the Vapi Web SDK.
- Push-to-talk mic control: hold a button to speak, release to mute instantly.
- Permission dashboard to request camera/mic access and surface current browser status.
- Clean teardown of camera and call resources when navigating between screens.

## Prerequisites
- Node.js 18+ (or any version supported by Vite 7).
- A Vapi **public** API key (safe to expose in the browser).

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and add your Vapi key:
   ```bash
   cp .env.example .env
   # edit .env and set VITE_VAPI_PUBLIC_KEY
   ```
3. Run the development server (HTTPS-ready on `localhost`):
   ```bash
   npm run dev
   ```
4. Visit the URL printed in the terminal, allow camera access, and scan a TalkieWalkie QR code (try `rio` for the included RIO assistant).

## Building for Production
```bash
npm run build
```
Outputs the static bundle into `dist/`. Deploy on any HTTPS-capable static host (Netlify, Vercel, Cloudflare Pages, etc.). Note: the bundle pulls in the Vapi SDK (~900 kB minified) which may exceed Vite's default chunk warning; this is expected.

## Project Structure
```
src/
  agentMap.ts       # Agent lookup map and QR payload normalizer
  components/
    CallScreen.tsx  # Call controls & status surface
    Scanner.tsx     # QR scanner built on @zxing/browser
  vapi.ts           # Singleton Vapi client setup
  App.tsx           # UI state machine wiring scanner <-> call screen
  main.tsx          # Entry point
```

## Adding New Agents
Update `src/agentMap.ts` with additional agent keys and Vapi assistant IDs. For remote configuration, replace the static map with a simple fetch to your own endpoint.

## Troubleshooting
- **Camera access denied:** Reopen site permissions and retry. The app will surface scanner failures with a retry button.
- **Microphone denied / call fails:** The call screen shows inline errors if the mic permission is blocked or the Vapi session cannot start.
- **iOS autoplay quirks:** Because the call starts in response to the scan navigation, Safari should allow it. If an issue persists, tap the primary button to retry.
