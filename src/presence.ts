// Generated. Do not edit by hand — the next run overwrites this file.
// If something here is wrong, say so in an issue rather than a pull request: the fix has to happen
// upstream, and a pull request against this file cannot be merged even when it is right.

// The presence channel of the real-time layer — "is someone typing". It is deliberately unlike the business-event
// channel: that one is per ORGANISATION, goes over server-sent events and Redis pub/sub, and tolerates being a few
// seconds late. This one is EPHEMERAL, per CONVERSATION, and has to land in under a second.
//
// It does NOT go through the event catalog or through `publish()`, and that is the point: this is not a business
// event. Nothing is persisted, nothing is audited, no consumer or delivery fires. Treating it as one would put a
// row in a durable table for every keystroke.
//
// The helpers here are PURE and dependency-free on purpose, because the producer and the endpoint that reads them
// live in different processes and have to agree exactly.

/**
 * The Redis pub/sub channel for one conversation: `conv:<id>`. The conversation id is an unguessable UUIDv7, and
 * that is still not treated as authorisation — the endpoint re-checks server-side that the conversation belongs to
 * the caller's organisation BEFORE subscribing. The channel name does not carry the organisation, so nothing about
 * the name can be used to prove who may listen.
 */
export function presenceChannel(conversationId: string): string {
  return `conv:${conversationId}`;
}

/** The outcome of reconciling a draft: it maps the harness's real `action` — sent, held as a draft, and so on. */
export type DraftOutcome = "sent" | "held" | "escalated" | "suppressed" | "error";

/**
 * A frame on this channel. The union is shaped to grow without breaking: `agent_typing` while the agent writes,
 * plus the two frames of the draft's shadow stream — `draft_delta`, an increment of the reply as the agent drafts
 * it, and `draft_done`, the reconciliation carrying the harness's real decision and the final authoritative text.
 * The lead only ever receives that through the outbox; the draft belongs to the OPERATOR. `turnId` groups the
 * frames of one turn, so two turns cannot interleave.
 */
export type PresenceFrame =
  | { type: "agent_typing"; typing: boolean; at: string /* ISO-8601 */ }
  | { type: "draft_delta"; turnId: string; text: string }
  | { type: "draft_done"; turnId: string; outcome: DraftOutcome; finalText: string | null };

/**
 * Serialises an `agent_typing` frame for publishing to Redis. The producer calls this and publishes; the endpoint
 * receives the string as-is, validates it, and forwards it downstream.
 */
export function agentTypingPayload(typing: boolean, atISO: string): string {
  return JSON.stringify({ type: "agent_typing", typing, at: atISO } satisfies PresenceFrame);
}

/** Serialises a `draft_delta` — one increment of the reply — for the shadow stream. */
export function draftDeltaPayload(turnId: string, text: string): string {
  return JSON.stringify({ type: "draft_delta", turnId, text } satisfies PresenceFrame);
}

/** Serialises the `draft_done`: the draft reconciled with the harness's real decision. */
export function draftDonePayload(turnId: string, outcome: DraftOutcome, finalText: string | null): string {
  return JSON.stringify({ type: "draft_done", turnId, outcome, finalText } satisfies PresenceFrame);
}

/** Formats a presence frame as a server-sent-events frame. No `id:` — this channel has no cursor and no replay. */
export function formatPresenceFrame(f: PresenceFrame): string {
  return `data: ${JSON.stringify(f)}\n\n`;
}
