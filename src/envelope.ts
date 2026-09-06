// Generated. Do not edit by hand — the next run overwrites this file.
// If something here is wrong, say so in an issue rather than a pull request: the fix has to happen
// upstream, and a pull request against this file cannot be merged even when it is right.

import { z } from "zod";

// The event envelope. What `publish()` accepts on top of the payload; everything else — the UUIDv7 id, the
// organization and actor taken from the tenant context, the recorded-at stamp — publish derives itself.
export const eventMetaSchema = z.object({
  actorType: z.enum(["user", "system", "webhook"]).default("system"),
  // When the actor is `system`, what set it off (an AI agent, a cron, a sweeper, a backfill) and against which
  // entity. This is what closes traceability for a non-human actor on the bus: without it, everything a machine
  // did is attributed to nobody. Both optional.
  actorSubtype: z.enum(["agent", "cron", "sweeper", "backfill"]).optional(),
  actorRef: z.string().uuid().optional(),
  occurredAt: z.date().optional(), // defaults to now() in the database
  traceContext: z.string().optional(), // W3C traceparent of the producer
  correlationId: z.string().uuid().optional(), // root of the causal chain
  causationId: z.string().uuid().optional(), // the event that caused this one
  correlationDepth: z.number().int().nonnegative().default(0),
  // Edge-triggered deduplication. When the producer supplies a DETERMINISTIC `id` — a UUIDv5 derived from the
  // state being reported — publish uses it as the event id together with `ON CONFLICT (id, occurred_at) DO NOTHING`.
  // Same state means the same id and the same `occurredAt`, so the insert does nothing: no spam, and no bookkeeping
  // to decide whether something already fired. It only works if `occurredAt` is derived from the state too.
  dedupeId: z.string().uuid().optional(),
});

export type EventMeta = z.input<typeof eventMetaSchema>;
