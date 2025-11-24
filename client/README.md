# SSE React Client

This Vite + React (TypeScript) app is the interactive half of the
server-sent-events example found in the repository root. It connects to the
Express SSE endpoint with the `EventSource` API, keeps state in sync via
`useSyncExternalStore`, and visualizes connection metadata, streamed payloads,
and header information.

## Running locally

```bash
npm install
npm run dev
```

By default the client expects the SSE server to be available at
`http://localhost:4000/events`. Override this by setting `VITE_SSE_URL` before
starting the dev server:

```bash
VITE_SSE_URL=http://localhost:5000/events npm run dev
```

## What to look for

- A dropdown lets you choose whether the server should stream continuously or
  shut down after the first tick, making it easy to observe SSE reconnection
  behavior.
- Connection state, last tick, heartbeats, echoed headers, and credential usage
  are all surfaced directly in the UI so you can understand the SSE lifecycle at
  a glance.

Use this app as a reference when building your own clients that consume
server-sent events.
