/**
 * Team chat real-time bus.
 *
 * Single dedicated pg client LISTENing on channel `team_chat`. Server-side
 * subscribers (SSE endpoints) receive events via a local EventEmitter. The
 * POST handler calls `notifyTeamChat(userIds)` after inserting a message,
 * which fans out to every estudio process via Postgres NOTIFY.
 */

import { EventEmitter } from "node:events";
import { Client } from "pg";

export interface TeamChatEvent {
  userIds: string[];
  /**
   * When present, this event is an ephemeral typing indicator instead of a
   * "new message" notification. `typing.userId` is the user that started or
   * stopped typing; `typing.active` is true while typing, false when done.
   */
  typing?: { userId: string; active: boolean };
}

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let listenClient: Client | null = null;
let connecting: Promise<void> | null = null;

async function ensureListener(): Promise<void> {
  if (listenClient) return;
  if (connecting) return connecting;

  connecting = (async () => {
    const client = new Client({
      connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    });

    client.on("error", (err) => {
      console.error("[team-chat-bus] listen client error:", err);
      listenClient = null;
      connecting = null;
    });

    client.on("end", () => {
      listenClient = null;
      connecting = null;
    });

    client.on("notification", (msg) => {
      console.log("[team-chat-bus] NOTIFY received:", msg.channel, msg.payload);
      if (msg.channel !== "team_chat" || !msg.payload) return;
      try {
        const payload = JSON.parse(msg.payload) as TeamChatEvent;
        const listenerCount = emitter.listenerCount("event");
        console.log("[team-chat-bus] fanning out to", listenerCount, "listeners");
        emitter.emit("event", payload);
      } catch (err) {
        console.error("[team-chat-bus] bad payload:", err);
      }
    });

    await client.connect();
    await client.query("LISTEN team_chat");
    console.log("[team-chat-bus] LISTEN client connected + subscribed");
    listenClient = client;
  })();

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}

export async function subscribeTeamChat(
  handler: (event: TeamChatEvent) => void
): Promise<() => void> {
  await ensureListener();
  emitter.on("event", handler);
  return () => emitter.off("event", handler);
}

/**
 * Broadcast a team chat event to all connected clients for the given users.
 * Uses the main pool (not the dedicated listen client).
 */
export async function notifyTeamChat(userIds: string[]): Promise<void> {
  if (!userIds.length) return;
  const { query } = await import("./db");
  const payload = JSON.stringify({ userIds });
  await query("SELECT pg_notify('team_chat', $1)", [payload]);
}

export async function notifyTeamChatTyping(
  userIds: string[],
  typingUserId: string,
  active: boolean
): Promise<void> {
  if (!userIds.length) return;
  const { query } = await import("./db");
  const payload = JSON.stringify({
    userIds,
    typing: { userId: typingUserId, active },
  });
  await query("SELECT pg_notify('team_chat', $1)", [payload]);
}
