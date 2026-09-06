// Generated. Do not edit by hand — the next run overwrites this file.
// If something here is wrong, say so in an issue rather than a pull request: the fix has to happen
// upstream, and a pull request against this file cannot be merged even when it is right.

import type { EventName } from "./catalog";

// The business-event channel of the real-time layer. The worker publishes to Redis pub/sub an event that is ALREADY
// materialised — the emitter wrote the projection and emitted in the SAME transaction, so by the time a subscriber
// reacts the row is queryable. Without that ordering, a client is told about something it cannot yet read.
//
// It does not go through durable delivery: this is not a saga. Subscribers are filtered per organisation, and again
// by what the reader is allowed to see.
//
// The helpers here are PURE and dependency-free, because the publisher and the endpoint are different processes and
// have to agree exactly on the channel name.

/** The Redis pub/sub channel for one organisation. One org, one channel; the endpoint filters the rest by permission. */
export function sseChannel(orgId: string): string {
  return `niiko:sse:${orgId}`;
}

/**
 * The v1 allowlist of this channel: the events that MOVE the pipeline board and the chat list. The rest of the
 * catalog is not streamed. The agent's three alerts belong to notifications — an email — and NOT to the board;
 * injecting them here would set off a storm of refreshes. Spam blocks and recorded signals change nothing on
 * screen. Local lead enrichment does not either: it only affects one tab of the lead's profile, so by the same
 * criterion it stays deliberately out.
 */
export const CANAL_A_EVENTS: ReadonlySet<EventName> = new Set<EventName>([
  "miira.lead.captured", // ★ a new lead enters the board and the chat list
  "miira.lead.scored",
  "miira.lead.rescored", // the score ring, which may cross a stage threshold
  "miira.lead.stage_changed", // a MANUAL stage move: hydrates other operators' boards live
  "inbox.conversation.bot_state_changed", // the automatic/human chip — a handoff between operators, which the board does reflect
  "inbox.message.received", // ★ a new message in the thread, inbound, outbound or an internal note → the chat list rehydrates live
  // ★ a send died in the dead-letter queue. It goes on this channel because it is the ONLY way back: the action
  // that queued it answered `{ok: true}` minutes before the worker discovered the rejection. Without this, the
  // thread would only show the failure if the operator reloaded on their own — that is, if they already suspected.
  "messaging.message.failed",
  "core.client.status_changed", // a lead became qualified
]);

/** Does this event type travel on this channel? (It accepts a plain `string` for the worker's call site.) */
export function isCanalAEvent(type: string): boolean {
  return (CANAL_A_EVENTS as ReadonlySet<string>).has(type);
}

/** The payload that travels over Redis pub/sub and out to the wire. `id` is the event's id, which doubles as the
 *  natural cursor for `Last-Event-Id`. */
export interface SseWireEvent {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: string; // ISO-8601
}

/** Formats an event as a server-sent-events frame: `id:` enables `Last-Event-Id`, `data:` carries the JSON. */
export function formatSseFrame(ev: SseWireEvent): string {
  return `id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/**
 * The per-module filter for this channel. The Redis channel has already partitioned by organisation, which is the
 * delivery boundary; here it is refined by capability: inbox events require the cross-module grant that lets the
 * agent read conversations, while the rest pass for any reader in the organisation. Fail closed — an inbox event
 * without that grant is not delivered.
 */
export function passesCanalAFilter(type: string, caps: { canInbox: boolean }): boolean {
  if (type.startsWith("inbox.")) return caps.canInbox;
  return true;
}
