import cors from "cors";
import express, { Request, Response } from "express";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const HEARTBEAT_MS = 10_000;
const TICK_MS = 3_000;
const WITH_CREDENTIALS =
  process.env.WITH_CREDENTIALS === "false" ? false : true;

type StreamMode = "continuous" | "single";
type StreamClient = Response;
type EventPayload = Record<string, unknown>;

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET"],
    credentials: WITH_CREDENTIALS,
  })
);

const clients = new Set<StreamClient>();

const formatSse = (payload: EventPayload) =>
  `data: ${JSON.stringify(payload)}\n\n`;

const summarizeHeaders = (req: Request) => ({
  origin: req.headers.origin ?? null,
  cookie: req.headers.cookie ? "present" : "absent",
  userAgent: req.headers["user-agent"] ?? null,
  accept: req.headers.accept ?? null,
});

app.get("/events", (req, res) => {
  const modeParam = String(req.query.mode ?? "").toLowerCase();
  const mode: StreamMode = modeParam === "single" ? "single" : "continuous";
  const singleShot = mode === "single";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (WITH_CREDENTIALS) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  clients.add(res);
  console.log(`Client connected (${clients.size} total)`);

  const handshakePayload = {
    type: "handshake",
    at: new Date().toISOString(),
    headers: summarizeHeaders(req),
    withCredentials: WITH_CREDENTIALS,
    mode,
  };
  res.write(formatSse(handshakePayload));

  const cleanup = () => {
    if (heartbeat) clearInterval(heartbeat);
    if (stream) clearInterval(stream);
    clients.delete(res);
    console.log(`Client disconnected (${clients.size} remaining)`);
  };

  let heartbeat: NodeJS.Timeout | undefined;
  let stream: NodeJS.Timeout | undefined;

  const sendTick = () => {
    const payload = {
      type: "tick",
      at: new Date().toISOString(),
      value: Math.floor(Math.random() * 1000),
      mode,
    };
    res.write(formatSse(payload));
  };

  if (singleShot) {
    sendTick();
    res.end();
    cleanup();
    return;
  }

  heartbeat = setInterval(() => {
    res.write(formatSse({ type: "heartbeat", at: new Date().toISOString(), mode }));
  }, HEARTBEAT_MS);

  stream = setInterval(() => {
    sendTick();
  }, TICK_MS);

  req.on("close", cleanup);
});

app.get("/", (_req, res) => {
  res.json({
    message: "SSE server is running",
    events: "/events",
  });
});

app.listen(PORT, () => {
  console.log(`SSE server listening on http://localhost:${PORT}`);
});
