const SSE_URL =
  (import.meta.env.VITE_SSE_URL as string | undefined) ??
  "http://localhost:4000/events";
export const WITH_CREDENTIALS = true;
const RECONNECT_MS = 3000;
const HISTORY_LIMIT = 20;
const DEFAULT_MODE: StreamMode = "continuous";

export type StreamMode = "continuous" | "single";

type HeaderSnapshot = {
  origin: string | null;
  cookie: "present" | "absent";
  userAgent: string | null;
  accept: string | null;
};

type BaseEvent = {
  type: string;
  at: string;
  mode?: StreamMode;
};

type TickEvent = BaseEvent & { type: "tick"; value: number };
type HeartbeatEvent = BaseEvent & { type: "heartbeat" };
type HandshakeEvent = BaseEvent & {
  type: "handshake";
  headers: HeaderSnapshot;
  withCredentials: boolean;
};
type StreamEvent = TickEvent | HeartbeatEvent | HandshakeEvent | BaseEvent;

type StreamStatus = "idle" | "connecting" | "connected" | "error" | "server";

type EventStoreState = {
  status: StreamStatus;
  lastEvent: StreamEvent | null;
  history: StreamEvent[];
  headers: HeaderSnapshot | null;
  withCredentials: boolean;
  mode: StreamMode;
};

let eventSource: EventSource | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

let state: EventStoreState = {
  status: "idle",
  lastEvent: null,
  history: [],
  headers: null,
  withCredentials: WITH_CREDENTIALS,
  mode: DEFAULT_MODE,
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const isStreamEvent = (value: unknown): value is StreamEvent => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.type === "string" && typeof record.at === "string";
};

const applyPayload = (payload: StreamEvent) => {
  const nextHistory = [payload, ...state.history].slice(0, HISTORY_LIMIT);

  state = {
    ...state,
    status: "connected",
    lastEvent: payload,
    history: nextHistory,
  };

  if ("headers" in payload) {
    state = {
      ...state,
      headers: payload.headers,
      withCredentials: Boolean(payload.withCredentials),
    };
  }

  if (payload.mode && payload.mode !== state.mode) {
    state = { ...state, mode: payload.mode };
  }

  emit();
};

const scheduleReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  if (state.mode === "continuous") {
    reconnectTimer = setTimeout(connect, RECONNECT_MS);
  }
};

const buildUrl = (mode: StreamMode) => {
  if (typeof window === "undefined") {
    return `${SSE_URL}?mode=${mode}`;
  }
  const url = new URL(SSE_URL, window.location.origin);
  url.searchParams.set("mode", mode);
  return url.toString();
};

const connect = () => {
  if (eventSource || typeof window === "undefined") {
    return;
  }

  state = { ...state, status: "connecting" };
  emit();

  const streamUrl = buildUrl(state.mode);

  eventSource = new EventSource(streamUrl, {
    withCredentials: WITH_CREDENTIALS,
  });

  eventSource.onopen = () => {
    state = { ...state, status: "connected" };
    emit();
  };

  eventSource.onerror = () => {
    const nextStatus = state.mode === "single" ? "idle" : "error";
    state = { ...state, status: nextStatus };
    emit();
    eventSource?.close();
    eventSource = undefined;
    scheduleReconnect();
  };

  eventSource.onmessage = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as unknown;
      if (isStreamEvent(payload)) {
        applyPayload(payload);
      } else {
        console.warn("Received malformed SSE payload", payload);
      }
    } catch (err) {
      console.error("Failed to parse SSE payload", err);
    }
  };
};

const disconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  eventSource?.close();
  eventSource = undefined;
  state = {
    status: "idle",
    lastEvent: null,
    history: [],
    headers: null,
    withCredentials: WITH_CREDENTIALS,
    mode: state.mode,
  };
};

export const subscribeToEvents = (listener: () => void) => {
  listeners.add(listener);
  if (!eventSource) {
    connect();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      disconnect();
    }
  };
};

export const getEventSnapshot = (): EventStoreState => state;

export const getServerSnapshot = (): EventStoreState => ({
  status: "server",
  lastEvent: null,
  history: [],
  headers: null,
  withCredentials: WITH_CREDENTIALS,
  mode: DEFAULT_MODE,
});

export const setStreamMode = (mode: StreamMode) => {
  if (state.mode === mode) {
    return;
  }
  state = {
    ...state,
    mode,
    status: "idle",
    lastEvent: null,
    history: [],
  };
  emit();
  if (eventSource) {
    disconnect();
  }
  connect();
};
