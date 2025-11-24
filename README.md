# Server-Sent Events Example



https://github.com/user-attachments/assets/f4ab2e00-e4d8-46b9-aada-ad9e4f9f4e91



This repository is a batteries-included example that shows how to wire up
server-sent events (SSE) end to end. A small Express + TypeScript server emits
JSON payloads over an SSE stream, and a Vite/React (TypeScript) client consumes
them with the `EventSource` API plus React’s `useSyncExternalStore`.

## Prerequisites

- Node.js 20.x
- npm 10+

If your global npm cache is read-only, you can reuse the local cache path
shown in the commands below.

## Install dependencies

```bash
cd /Users/nabhag/OpenSource/server-sent-events
npm_config_cache=$PWD/.npm-cache npm install --prefix server
npm_config_cache=$PWD/.npm-cache npm install --prefix client
```

## Running the SSE server

```bash
cd server
npm run start
```

Environment variables:

- `PORT` (default `4000`)
- `CLIENT_ORIGIN` (default `http://localhost:5173`)
- `WITH_CREDENTIALS` (`true` by default) – toggles whether the server sets CORS
  headers for credentialed SSE connections.

## Running the React client

```bash
cd client
npm run dev
```

You can override the SSE endpoint with `VITE_SSE_URL` (defaults to
`http://localhost:4000/events`). The client connects with
`EventSource(..., { withCredentials: true })`, surfaces the connection status,
echoed request headers, and exposes a dropdown that toggles whether the server
should stream endlessly or close after the first tick—perfect for experimenting
with different SSE behaviors.

## How it works

- The Express server (written in TypeScript) exposes `/events`, streams JSON
  payloads, reports handshake headers, keeps the connection alive with
  heartbeats, and inspects the `mode` query parameter so it can either stream
  indefinitely or shut down after the first tick—ideal for understanding how SSE
  lifecycles behave.
- The React app centralizes the `EventSource` instance inside a tiny external
  store (also TypeScript) and exposes `subscribeToEvents`. Components use
  `useSyncExternalStore` to stay in sync with the SSE feed without redundant
  reconnections, while the UI showcases connection metadata, header echoes,
  credential usage, and the currently active streaming mode.

## Try it out

1. Start the server: `cd server && npm run start`
2. Start the client: `cd client && npm run dev`
3. Visit the Vite dev server URL (typically `http://localhost:5173`) and switch
   between streaming modes to watch how the SSE connection reacts.

Use this project as a reference when you need a working example of SSE in a
modern TypeScript stack.
