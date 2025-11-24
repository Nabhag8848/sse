import { useSyncExternalStore, type ChangeEvent } from "react";
import {
  subscribeToEvents,
  getEventSnapshot,
  getServerSnapshot,
  setStreamMode,
  type StreamMode,
} from "./eventStore";
import "./App.css";

const SSE_URL =
  (import.meta.env.VITE_SSE_URL as string | undefined) ??
  "http://localhost:4000/events";

const statusLabels: Record<string, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  connected: "Receiving updates",
  error: "Reconnecting…",
  server: "Server render",
};

const statusTone: Record<string, string> = {
  idle: "badge idle",
  connecting: "badge connecting",
  connected: "badge connected",
  error: "badge error",
  server: "badge idle",
};

const modeLabels: Record<StreamMode, string> = {
  continuous: "Stream endlessly",
  single: "Stop after one tick",
};

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString() : "—";

function App() {
  const stream = useSyncExternalStore(
    subscribeToEvents,
    getEventSnapshot,
    getServerSnapshot
  );

  const { status, lastEvent, history, headers, withCredentials, mode } = stream;
  const headerEntries = headers ? Object.entries(headers) : [];
  const lastValue = lastEvent && "value" in lastEvent ? lastEvent.value : "—";
  const lastHeartbeat = history.find((event) => event.type === "heartbeat");

  const handleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStreamMode(event.target.value as StreamMode);
  };

  return (
    <main className="app">
      <section className="panel hero">
        <header>
          <p className={statusTone[status] ?? "badge idle"}>
            {statusLabels[status] ?? status}
          </p>
          <h1>Server-sent events demo</h1>
        </header>
        <p>
          This React view stays in sync with an Express SSE endpoint using the{" "}
          <code>EventSource</code> API and <code>useSyncExternalStore</code>.
        </p>
        <div className="stats">
          <div>
            <span className="label">Last event type</span>
            <strong>{lastEvent?.type ?? "—"}</strong>
          </div>
          <div>
            <span className="label">Value</span>
            <strong>{lastValue}</strong>
          </div>
          <div>
            <span className="label">Received at</span>
            <strong>{formatTime(lastEvent?.at)}</strong>
          </div>
        </div>
      </section>

      <section className="panel connection">
        <div className="connection-header">
          <h2>Connection details</h2>
          <span className={`pill ${withCredentials ? "on" : "off"}`}>
            withCredentials {withCredentials ? "enabled" : "disabled"}
          </span>
        </div>
        <div className="connection-body">
          <div>
            <span className="label">SSE endpoint</span>
            <code className="endpoint">{SSE_URL}</code>
          </div>
          <div className="mode-field">
            <label htmlFor="mode-select" className="label">
              Stream behavior
            </label>
            <select
              id="mode-select"
              value={mode}
              onChange={handleModeChange}
              className="mode-select"
            >
              {Object.entries(modeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">Last heartbeat</span>
            <strong>{formatTime(lastHeartbeat?.at)}</strong>
          </div>
        </div>
        <div className="headers-panel">
          <h3>Handshake headers</h3>
          {headerEntries.length === 0 ? (
            <p className="empty small">
              Waiting for the server to echo the incoming headers…
            </p>
          ) : (
            <dl>
              {headerEntries.map(([key, value]) => (
                <div key={key} className="header-row">
                  <dt>{key}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="panel feed">
        <h2>Event history</h2>
        {history.length === 0 ? (
          <p className="empty">Waiting for events…</p>
        ) : (
          <ul>
            {history.map((event, idx) => (
              <li key={`${event.at}-${idx}`}>
                <span className="type">{event.type}</span>
                <span className="time">{formatTime(event.at)}</span>
                {"value" in event ? (
                  <span className="value">{event.value}</span>
                ) : (
                  <span className="value">—</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
