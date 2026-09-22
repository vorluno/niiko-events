// Generated. Do not edit by hand — the next run overwrites this file.
// If something here is wrong, say so in an issue rather than a pull request: the fix has to happen
// upstream, and a pull request against this file cannot be merged even when it is right.

import { z } from "zod";

// The UNIFORM payload of the agent's three internal alerts: a handoff request, a breached SLA, and a stalled
// lead. `reason` is the discriminator, so a consumer switches on it instead of parsing the event name;
// `thresholdTier` is the SLA tier that was crossed, or 'immediate' for a handoff; `lastInboundAt` is an ISO
// timestamp. No recipient and no raw personal data.
const leadAlertPayload = z.object({
  leadId: z.string().uuid(),
  reason: z.enum(["sla_breached", "stalled_detected", "handoff_requested"]),
  thresholdTier: z.string(),
  lastInboundAt: z.string(), // ISO-8601
});

// The event catalog: every event is defined ONCE, here, with its payload schema. The name is always
// `module.entity.action`. `publish()` validates against this catalog, so there is no such thing as an ad-hoc
// event. Modules add theirs as they are built.
export const eventCatalog = {
  // Emitted when a brand-new client or lead is created — not on a find-or-create that matched an existing one.
  // `source` is where the record came from (a web form, the agent, manual entry, an import). Who did it travels
  // in the envelope, not here.
  "core.client.created": z.object({
    clientId: z.string().uuid(),
    source: z.string(),
  }),
  "core.client.status_changed": z.object({
    clientId: z.string().uuid(),
    from: z.string(),
    to: z.string(),
  }),
  // Emitted when a new record matches two or more existing ones and there is no conversation to disambiguate it
  // with: a web form, a CSV, a manual entry. It fills the disambiguation queue. Inbound messages that DO have a
  // conversation are handled separately, by the inbox.
  "core.client.disambiguation_needed": z.object({
    disambiguationId: z.string().uuid(),
    candidateClientIds: z.array(z.string().uuid()),
  }),
  // Emitted when a human resolves one of those cases: merged into an existing record, created as a new one, or
  // dismissed. The permission check belongs to the call site, not to the event.
  "core.client.disambiguation_resolved": z.object({
    disambiguationId: z.string().uuid(),
    resolution: z.enum(["merged_into", "created_new", "dismissed"]),
    survivorId: z.string().uuid().optional(),
    createdClientId: z.string().uuid().optional(),
  }),
  // The losing record was merged into the survivor, leaving a tombstone and a redirect behind. Modules consume
  // this to reconcile whatever they stored against the loser onto the survivor.
  "core.client.merged": z.object({
    survivorId: z.string().uuid(),
    loserId: z.string().uuid(),
  }),
  "core.invoice.status_changed": z.object({
    invoiceId: z.string().uuid(),
    from: z.string(),
    to: z.string(),
  }),
  // Emitted on every entry written to the consent ledger, which is append-only.
  "messaging.consent.recorded": z.object({
    contactId: z.string().uuid(),
    channel: z.string(),
    purpose: z.string(),
    action: z.string(),
  }),
  // Emitted when an identifier is suppressed. No personal data: the identifier itself is stored as an HMAC in the
  // table, and never travels in the event.
  "messaging.suppression.entered": z.object({
    channel: z.string(),
    scope: z.string(),
    reason: z.string(),
  }),
  // A suppression WITHDRAWN. No personal data, like its twin. The `reason` here is deliberately NOT the enum the
  // suppression used: it is free text, written by whoever withdraws it, and it is required. Withdrawing a
  // suppression is exactly the move someone would make to keep messaging a person who asked not to be contacted,
  // so the why is recorded next to the who.
  "messaging.suppression.exited": z.object({
    channel: z.string(),
    reason: z.string(),
  }),
  // Emitted when a send ends up TERMINALLY failed: no consent, suppressed, outside the messaging window, a paused
  // template, an endpoint that was never reconnected. Its reason for existing is the real-time channel — the
  // action that queued the message answered `{ok: true}` minutes ago, so this event is the ONLY thing that can
  // tell the operator's screen it never arrived. A merely deferred send does not emit it: that one is still going
  // out, and a failure notice there would be a false alarm. No personal data: ids, enums, and the technical
  // reason.
  "messaging.message.failed": z.object({
    outboxId: z.string().uuid(),
    conversationId: z.string().uuid().nullable(), // null when the send has no conversation behind it (a broadcast, a notification)
    contactId: z.string().uuid().nullable(), // null only on the in-product channel, whose support thread has no CRM contact
    channel: z.enum(["whatsapp", "email", "inapp"]), // the in-product channel: its failures are surfaced in real time too
    purpose: z.enum(["marketing", "utility", "service"]),
    origin: z.enum(["agent", "human", "system"]),
    reason: z.string().nullable(), // the worker's own last error, verbatim; null when it recorded no reason
    templateKey: z.string().nullable(),
  }).strict(),
  // Emitted when a brand-new conversation is opened — not on a find-or-create that matched an existing one.
  "inbox.conversation.created": z.object({
    conversationId: z.string().uuid(),
    channel: z.string(),
    mailbox: z.string(),
  }),
  // Emitted when an inbound message is recorded. Idempotent: a deduplicated message does not re-emit. Other
  // modules consume this to react — the CRM hangs an activity off it, the agent sees the lead's thread — without
  // reaching into the inbox's own tables.
  "inbox.message.received": z.object({
    conversationId: z.string().uuid(),
    messageId: z.string().uuid(),
    direction: z.string(),
  }),
  // Emitted when the bot state of a conversation flips between automatic and human. The worker re-checks that
  // state before every agent emission, fail-closed: a handoff between queueing and sending cancels the send.
  "inbox.conversation.bot_state_changed": z.object({
    conversationId: z.string().uuid(),
    from: z.string(),
    to: z.string(),
  }),
  // Archiving and unarchiving: decluttering, not lifecycle. It hides or shows the conversation in the default
  // list. Deliberately outside the real-time channel — it does not move anyone's board and needs no live
  // cross-operator update.
  "inbox.conversation.archived_changed": z.object({
    conversationId: z.string().uuid(),
    archived: z.boolean(),
  }),
  // Emitted when the ACTIVE domain of a conversation changes, derived from relationship and intent by the agent's
  // turn; the mailbox it arrived through stays as an origin tag. Deliberately outside the real-time channel: a
  // domain change always arrives attached to a turn whose inbound-message event already refreshes the view.
  // `from` is null when the conversation had no derived domain yet — anything older than this mechanism, on the
  // first turn that derives one.
  "inbox.conversation.active_domain_changed": z.object({
    conversationId: z.string().uuid(),
    // A support conversation is BORN with that domain and never passes through the setter, so the setter's `to`
    // stays deliberately narrow; but `from` is read from the column and can be it. Deriving "support" from intent
    // on ordinary conversations is deferred — when it exists, `to` widens along with its producer.
    from: z.enum(["miira", "kiipu", "support"]).nullable(),
    to: z.enum(["miira", "kiipu", "support"]),
  }),
  // Emitted on an inbound message that DOES have a conversation and matches two or more records. It fills the
  // inbox's own disambiguation queue, and the conversation is pinned to human handling until someone resolves it.
  "inbox.disambiguation.needed": z.object({
    disambiguationId: z.string().uuid(),
    conversationId: z.string().uuid(),
    candidateClientIds: z.array(z.string().uuid()),
  }),
  // The support module. Its producers arrive with a later slice of the plan — until then these live in the catalog
  // as a contract, because the rule is to declare before emitting. The text of a ticket NEVER travels in the
  // payload: it lives encrypted with the message. Only ids and enums.
  "support.case.opened": z.object({
    caseId: z.string().uuid(),
    conversationId: z.string().uuid(),
    requesterOrgId: z.string().uuid(),
    severity: z.enum(["critical", "high", "normal", "unclassified"]),
  }),
  "support.case.escalated": z.object({
    caseId: z.string().uuid(),
    severity: z.enum(["critical", "high", "normal", "unclassified"]),
    reason: z.enum(["severity", "requester_asked", "bot_gap"]),
  }),
  "support.case.resolved": z.object({
    caseId: z.string().uuid(),
    resolvedBy: z.string(),
  }),
  "support.feedback.submitted": z.object({
    feedbackId: z.string().uuid(),
    kind: z.enum(["feedback", "kb_gap"]),
    module: z.string().nullable(),
  }),
  // The intent to cancel, with its reason and the branch it took. The REASON travels because it is the churn
  // datum and it is a closed enum; the customer's own words do NOT, because they live encrypted in the thread.
  // No consumer yet: today the churn report reads the table directly. The event exists so that adding the future
  // consumer does not force a rewrite of the producer.
  "support.cancellation.intent": z.object({
    caseId: z.string().uuid(),
    reason: z.enum(["precio", "no_lo_uso", "me_falta_algo", "problema_tecnico", "otro"]),
    branch: z.enum(["oferta", "handoff", "incidente", "hueco", "salida"]),
  }),
  // The offer presented and the offer accepted are EXACTLY one row of the retention catalog — the event carries
  // its id, never free-form terms. The catalog IS the policy.
  "support.retention_offer.presented": z.object({
    caseId: z.string().uuid(),
    offerId: z.string().uuid(),
  }),
  "support.retention_offer.accepted": z.object({
    caseId: z.string().uuid(),
    offerId: z.string().uuid(),
  }),
  // Emitted when a source — a web form, a referral — captures a lead. It sits on top of ordinary client creation,
  // which emits its own event when the record is genuinely new. `outcome` says whether this one was created or
  // already existed.
  "miira.lead.captured": z.object({
    clientId: z.string().uuid(),
    source: z.string(),
    outcome: z.string(),
  }),
  // Emitted when the DETERMINISTIC anti-spam gate rejects a submission before any model runs, so a spam attempt
  // costs nothing. No personal data — only the reason: a honeypot, a disposable email, an invalid identity.
  "miira.lead.spam_blocked": z.object({
    source: z.string(),
    reason: z.string(),
  }),
  // Emitted when a signal is recorded, append-only. The model emits; the harness weighs.
  "miira.lead.signal_recorded": z.object({
    clientId: z.string().uuid(),
    signalType: z.string(),
    signalKey: z.string(),
  }),
  // Emitted when a lead is scored. `scored` is the first computation for that lead; `rescored` is a recompute
  // after a new signal or a model change. System-triggered, inside the usual envelope of budget checks and a
  // circuit breaker.
  "miira.lead.scored": z.object({
    clientId: z.string().uuid(),
    scoreTotal: z.number(),
    band: z.string(),
  }),
  "miira.lead.rescored": z.object({
    clientId: z.string().uuid(),
    scoreTotal: z.number(),
    band: z.string(),
  }),
  // Emitted after reading an image or document attached to a capture conversation. It doubles as an idempotency
  // checkpoint: its id is derived from the organisation, the lead and the storage key, so exactly ONE of the two
  // outcomes — extracted, or needs review — is recorded per attachment. No personal data: the storage key is a
  // reference, and the field names and review reasons are metadata, never values. No consumer registered yet; the
  // human already sees the attachment in the conversation, and a dedicated review screen is later work.
  "miira.lead.document_extracted": z.object({
    clientId: z.string().uuid(),
    storageKey: z.string(),
    fieldsWritten: z.array(z.string()),
    // Per-field confidence for what was WRITTEN, plus what was read and fell BELOW its threshold — keys and
    // numbers, never values. Optional, because events from before this existed do not carry them.
    fieldConfidence: z.record(z.string(), z.number()).optional(),
    fieldsBelowThreshold: z.array(z.object({ key: z.string(), confidence: z.number() })).optional(),
  }),
  "miira.lead.document_needs_review": z.object({
    clientId: z.string().uuid(),
    storageKey: z.string(),
    reviewReason: z.string(),
    // What could be read even though it was not applied, so the reviewer's panel can say "this was read with 0.6
    // confidence, confirm it yourself" — keys and confidences, never the values that were read.
    fieldsBelowThreshold: z.array(z.object({ key: z.string(), confidence: z.number() })).optional(),
  }),
  // Emitted when LOCAL enrichment — derived from the email domain and heuristics, with no network and no model —
  // changes what was stored. Idempotent per domain: no change, no re-emission. The payload is deliberately MINIMAL
  // and never carries the derived values, because those are personal data; only which lead changed and which keys
  // were touched. Whoever needs a value reads it, decrypted, from the record. It does NOT go on the real-time
  // channel: it moves no board, only one tab of the lead's profile.
  "miira.lead.enriched": z.object({
    leadId: z.string().uuid(),
    fieldsUpdated: z.array(z.string()),
  }),
  // Emitted on a MANUAL stage move, or when a pinned stage is deleted underneath it. Only those two causes — a
  // migration driven by the score does not emit this, because there the column is a recomputable projection. A pin
  // is the ONLY source of a stored current stage, so it needs its own event to hydrate other operators' boards
  // live. That happens over the real-time channel, not durable delivery.
  "miira.lead.stage_changed": z.object({
    clientId: z.string().uuid(),
    fromStage: z.string(),
    toStage: z.string(),
    cause: z.enum(["manual", "stage_deleted_default"]),
  }),
  // The agent's three internal alerts share one UNIFORM payload. They are consumed by notifications, which sends
  // an INTERNAL email — never through the customer messaging package, which is a different thing with different
  // rules. No recipient in the payload (that is resolved when consuming) and no raw personal data (the consumer
  // hydrates what it needs at render time).
  // The sweeper's event id is deterministic, derived from the organisation, lead, reason, tier and last inbound —
  // which gives deduplication without a table to keep it in.
  //   - handoff_requested: the agent asks for a human (a buying signal, an escalation, something off-script).
  //   - sla_breached:      a HOT lead untouched past its tier's threshold.
  //   - stalled_detected:  a lead that walked away mid-conversation, past the stalled threshold.
  "miira.lead.handoff_requested": leadAlertPayload,
  "miira.lead.sla_breached": leadAlertPayload,
  "miira.lead.stalled_detected": leadAlertPayload,
  // The nudge sweeper queued a proactive follow-up, attempt N. An append-only, idempotent trail: the id is derived
  // from the organisation, the lead, the attempt and the last inbound. Off the real-time channel — no board
  // refreshes because of it.
  "miira.lead.nudged": z.object({
    leadId: z.string().uuid(),
    conversationId: z.string().uuid(),
    attempt: z.number().int().min(1),
    templateKey: z.string(),
    lastInboundAt: z.string(), // ISO-8601
  }),
  // Emitted when any area of the agent's configuration is saved, bumping the configuration version that later gets
  // stamped on each turn. Future consumers: reporting and cache invalidation; no handler yet.
  "miira.agent.config_changed": z.object({
    mailbox: z.string(),
    configVersion: z.number().int(),
    changedAreas: z.array(z.string()),
  }),
  // ── Outbound campaigns ────────────────────────────────────────────────────────────────────────────
  // Emitted when the cost-and-ETA screen is confirmed. The payload IS the snapshot of that estimate — the rates
  // used, their version, the ETA — so the post-campaign report can audit estimated against actual within ten
  // percent. `byChannel` carries the split: counts, no personal data.
  "miira.campaign.confirmed": z.object({
    campaignId: z.string().uuid(),
    audienceTotal: z.number().int(),
    byChannel: z.object({
      whatsapp: z.number().int(),
      email: z.number().int(),
      suppressed: z.number().int(),
    }),
    estimatedCostUsd: z.number(),
    etaDays: z.number().int(),
    rateCardVersion: z.number().int(),
  }),
  // Emitted when the staggered send finishes and every batch has drained. Totals for the report.
  "miira.campaign.completed": z.object({
    campaignId: z.string().uuid(),
    totals: z.object({
      sent: z.number().int(),
      delivered: z.number().int(),
      read: z.number().int(),
      replied: z.number().int(),
      failed: z.number().int(),
      suppressed: z.number().int(),
    }),
  }),
  // The recipient's lifecycle, projected from the provider's status webhooks. A reply also stops the sequence and
  // revives the pipeline.
  "miira.recipient.delivered": z.object({
    campaignId: z.string().uuid(),
    recipientId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  "miira.recipient.read": z.object({
    campaignId: z.string().uuid(),
    recipientId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  "miira.recipient.replied": z.object({
    campaignId: z.string().uuid(),
    recipientId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  // Emitted when an organisation is created. `vertical` is the canonical agency vertical.
  // No consumer registered yet — a producer without a consumer is allowed, on purpose.
  "core.org.created": z.object({
    organizationId: z.string().uuid(),
    slug: z.string(),
    vertical: z.string(),
  }),
  // Emitted when a workspace is renamed. The workspace name is not just another form field: the team sees it in
  // the switcher and **it is the brand the end customer sees** when the white-label portal is on, so renaming is a
  // change observable from outside and deserves its own event. It does NOT touch the slug — that moves URLs and is
  // its own piece of work — so the payload does not carry one: whoever reacts to this must not assume the URLs
  // changed. The names here are the organisation's COMMERCIAL name, not a person's.
  // No consumer registered yet.
  "core.org.renamed": z.object({
    organizationId: z.string().uuid(),
    previousName: z.string(),
    name: z.string(),
  }),
  // Emitted when a grant between modules is toggled. It goes through the transactional outbox, invalidates the
  // cached set, and workers still re-check at execution time, fail-closed. It is NEVER emitted for a grant that is
  // blocked — the toggle is disabled there, so there is no write to announce.
  // `previous` is the state before: `null` means this row had never been touched, and absence meant the
  // manifest's default.
  "core.module_grant.changed": z.object({
    capability: z.string(),       // namespaced capability, e.g. 'inbox.conversations.read_in_miira'
    consumerModule: z.string(),   // the module in whose context the capability is exercised
    granted: z.boolean(),         // the new state (true = on, false = off)
    previous: z.boolean().nullable(), // the previous state (null = a new row, with no override before)
    changedBy: z.string().uuid(), // the operator who flipped it
  }),
  // The CRM's catalog is born in this phase; the real producers arrive with a later wave. `stage_changed`, `won`
  // and `lost` are mutually exclusive per event: won and lost carry their own type rather than travelling as a
  // stage change with a flag on it.
  "crm.deal.created": z.object({
    dealId: z.string().uuid(),
    clientId: z.string().uuid(),
    stageId: z.string().uuid(),
  }),
  "crm.deal.stage_changed": z.object({
    dealId: z.string().uuid(),
    fromStageId: z.string().uuid(),
    toStageId: z.string().uuid(),
  }),
  "crm.deal.won": z.object({
    dealId: z.string().uuid(),
    clientId: z.string().uuid(),
    valueUsd: z.string().nullable(), // a decimal(12,2) travels as a string — exact precision, no floats
  }),
  "crm.deal.lost": z.object({
    dealId: z.string().uuid(),
    clientId: z.string().uuid(),
    lostReason: z.string().nullable(),
  }),
  // `actor` distinguishes a human activity from one the agent created.
  "crm.activity.logged": z.object({
    activityId: z.string().uuid(),
    clientId: z.string().uuid(),
    type: z.enum(["note", "call", "task"]),
    actor: z.enum(["human", "agent"]),
  }),
  "crm.activity.completed": z.object({
    activityId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  // Emitted when a client or lead's owner is assigned or reassigned. `previousOwnerUserId` is null on the first
  // assignment, when the lead was unassigned.
  "crm.client.owner_changed": z.object({
    clientId: z.string().uuid(),
    previousOwnerUserId: z.string().nullable(),
    newOwnerUserId: z.string(),
  }),
  // The bulk import will emit these when its asynchronous job finishes.
  "crm.import.completed": z.object({
    importJobId: z.string().uuid(),
    totals: z.object({ imported: z.number(), skipped: z.number(), duplicates: z.number() }),
  }),
  "crm.import.failed": z.object({
    importJobId: z.string().uuid(),
    reason: z.string(),
  }),
  // Emitted when an offering is created or updated. The payload is MINIMAL — id, kind, name; the detail (price,
  // state, attributes) is read from the table and not from the event, which keeps business data off the bus. No
  // consumer registered yet.
  "catalog.offering.created": z.object({
    offeringId: z.string().uuid(),
    kind: z.string(),
    name: z.string(),
  }),
  "catalog.offering.updated": z.object({
    offeringId: z.string().uuid(),
    kind: z.string(),
    name: z.string(),
  }),
  // Commercial proposals. Careful: the scheduling proposals further down are a different thing entirely — those
  // are proposed TIME SLOTS. Same noun, different domains: this one is the priced document a customer accepts.
  "niima.proposal.sent": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
    channel: z.enum(["whatsapp", "email", "both"]),
  }),
  "niima.proposal.viewed": z.object({
    proposalId: z.string().uuid(),
    // `true` only the FIRST time. The consumer that notifies the tenant does not want one notification per reload.
    first: z.boolean(),
  }),
  "niima.proposal.accepted": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
    totalUsd: z.string(),
    // A hash of WHAT WAS AGREED, not of the HTML: it anchors the acceptance to reproducible content, not to an id.
    contentHash: z.string(),
  }),
  "niima.proposal.declined": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  "niima.proposal.expired": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  // The customer asked for a change AFTER accepting. It opens a handoff; it never modifies the proposal.
  "niima.proposal.change_requested": z.object({
    proposalId: z.string().uuid(),
    changeRequestId: z.string().uuid(),
  }),
  // Scheduling. Singular naming throughout. This phase catalogs them; the durable consumers arrive with their own
  // slices — an expired proposal will let the agent revive the lead. Writing the booking back into the
  // conversation is done by scheduling itself, so it is not a cross-module consumption. None of these are on the
  // real-time channel in v1.
  "scheduling.proposal.created": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
    conversationId: z.string().uuid(),
    slotCount: z.number().int(),
  }),
  "scheduling.proposal.expired": z.object({
    proposalId: z.string().uuid(),
    clientId: z.string().uuid(),
    conversationId: z.string().uuid(),
  }),
  "scheduling.booking.confirmed": z.object({
    bookingId: z.string().uuid(),
    clientId: z.string().uuid(),
    conversationId: z.string().uuid().nullable(),
    startsAt: z.string(),
  }),
  "scheduling.booking.cancelled": z.object({
    bookingId: z.string().uuid(),
    clientId: z.string().uuid(),
    reason: z.string(),
  }),
  "scheduling.booking.rescheduled": z.object({
    bookingId: z.string().uuid(),
    clientId: z.string().uuid(),
    fromStartsAt: z.string(),
    toStartsAt: z.string(),
  }),
  "scheduling.booking.completed": z.object({
    bookingId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  "scheduling.booking.no_show": z.object({
    bookingId: z.string().uuid(),
    clientId: z.string().uuid(),
  }),
  "scheduling.booking.reminder_sent": z.object({
    bookingId: z.string().uuid(),
    offset: z.enum(["t_24h", "t_1h"]),
  }),
  // Collections. Emitted in the SAME transaction as the insert, following the transactional-outbox pattern. Its
  // consumer runs document extraction over the proof of payment already stored, and writes the OCR result.
  // It NEVER auto-applies anything — the consumer writes OCR, never the ledger. `source` travels so the consumer
  // does not have to resolve the submission twice just to know where it came from in a log; the organisation goes
  // in the envelope, NEVER in the payload, like everywhere else in this catalog.
  "kiipu.submission.received": z.object({
    submissionId: z.string().uuid(),
    source: z.enum(["payment_link", "agent", "manual"]),
  }),
  // Emitted transactionally in the SAME transaction as the accounting entry it belongs to. The payload is sealed:
  // `approvalId` is the idempotency anchor, and NEVER a gateway's event id — this path is bank-transfer only.
  // Its consumer is the general ledger.
  "kiipu.payment.applied": z.object({
    approvalId: z.string(),
    invoiceId: z.string().uuid(),
    amountApplied: z.string(), // a decimal(18,2) travels as a string — exact precision, no floats
    currency: z.literal("USD"), // this path is USD-only; accounting rejects anything else
    method: z.enum(["comprobante", "compensación"]), // bank transfer only, never a checkout
    allocations: z.array(
      z.object({ installmentId: z.string().uuid(), amountAllocated: z.string() }),
    ),
    creditGranted: z
      .object({ grantId: z.string(), amount: z.string(), reason: z.enum(["overpayment", "goodwill", "prepayment"]) })
      .optional(), // present ONLY if the allocation left a remainder and credit was granted in the SAME transaction
  }),
  // Emitted by the daily dunning worker for each instalment newly found overdue. Idempotent per instalment per
  // day, so re-running the sweep the SAME day does not re-emit. Different from the idempotency of the reminder's
  // SEND, which is the messaging layer's own 24-hour deduplication.
  "kiipu.installment.overdue": z.object({
    installmentId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    scheduledDate: z.string(), // ISO-8601
    outstandingAmount: z.string(),
  }),
  // Emitted by the dunning cron in the SAME transaction that queues the reminder, following the outbox pattern.
  // Idempotent per instalment per day — a DIFFERENT mechanism from the outbox's own primary key, two locks at the
  // same daily granularity. `sweepKind` says which of the two DISJOINT sweeps produced it. No consumer registered
  // yet: this is dunning telemetry for a dashboard.
  "kiipu.reminder.sent": z.object({
    installmentId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    channel: z.enum(["whatsapp", "email"]),
    sweepKind: z.enum(["overdue", "due_today"]),
  }),
  // Telemetry for the ISSUANCE NOTICE, emitted in the SAME transaction that queues the message. One PER CHANNEL:
  // the notice goes out over WhatsApp and over email independently, and the invoice's timeline has to be able to
  // say which of the two left — if one failed, the other's row is still true.
  //
  // It deliberately does NOT reuse the dunning reminder event. That one requires an instalment id and which of the
  // two overdue sweeps produced it, and this is neither a sweep nor about an instalment. Squeezing it in with a
  // third sweep kind would make the dunning telemetry lie — "overdue reminders sent" would start counting notices
  // for invoices that owed nothing.
  //
  // No consumer registered: the invoice's own screen READS it by querying the event table directly, not by
  // subscribing.
  "kiipu.invoice_notice.sent": z.object({
    invoiceId: z.string().uuid(),
    channel: z.enum(["whatsapp", "email"]),
  }),
  // The lifecycle of a recurring membership. An `invoice_emitted` event was deliberately REMOVED: the issuing of
  // an invoice is announced by the canonical invoice status change and nothing else — no module-specific event
  // signals an invoice transition. No consumer registered yet.
  "kiipu.subscription.created": z.object({
    subscriptionId: z.string().uuid(),
    clientId: z.string().uuid(),
    planId: z.string().uuid(),
  }),
  "kiipu.subscription.renewed": z.object({
    subscriptionId: z.string().uuid(),
    periodKey: z.string(), // e.g. '2026-07' — the link between invoice and subscription travels in this field, not as a foreign key
    invoiceId: z.string().uuid(),
  }),
  "kiipu.subscription.paused": z.object({
    subscriptionId: z.string().uuid(),
  }),
  // Resume (paused → active): same lifecycle, and it travels under the `pause` permission, because it is a toggle.
  "kiipu.subscription.resumed": z.object({
    subscriptionId: z.string().uuid(),
  }),
  // The expiry of a PREPAID subscription — no debt involved, and a postpaid plan never emits it.
  "kiipu.subscription.expired": z.object({
    subscriptionId: z.string().uuid(),
    periodKey: z.string(),
  }),
  // A RENEWAL reminder: retention, not collections. A separate mechanism from the dunning reminder precisely so
  // that collections metrics do not end up counting retention notices.
  "kiipu.renewal_notice.sent": z.object({
    subscriptionId: z.string().uuid(),
    periodKey: z.string(),
    offsetDays: z.number().int(),
    channel: z.enum(["whatsapp"]),
  }),
  // The general ledger. Emitted through the transactional outbox in the SAME transaction as the posting — every
  // time a journal entry is posted, whether automatic, a manual adjustment, a period close, or a prior-period
  // adjustment. `sourceRef` is the typed form of the source reference, and it is optional because the annual
  // closing entry has no external originating event.
  "accounting.entry.posted": z.object({
    entryId: z.string().uuid(),
    period: z.string(), // 'YYYY-MM' — the accounting period the entry belongs to
    sourceRef: z.object({ sourceModule: z.string(), sourceType: z.string(), sourceId: z.string() }).optional(),
    isClosingEntry: z.boolean(),
    isPriorPeriodAdjustment: z.boolean(),
    correlationId: z.string().uuid().optional(),
  }),
  // `accessUntil`: how long the member keeps access. Cancelling HONOURS the period already paid for — the period
  // belongs to them, not to the tenant — so whoever consumes this needs the date, not just the fact.
  // Nullable defensively: a row without a next run cannot exist today, because the column forbids it, but the
  // contract does not promise what the database might stop guaranteeing.
  "kiipu.subscription.canceled": z.object({
    subscriptionId: z.string().uuid(),
    accessUntil: z.string().datetime().nullable(),
  }),
  // Emitted by the reconciliation cron when the sum of the subledger and the general ledger diverge beyond the
  // tolerance of one cent. It raises an INTERNAL priority alert through notifications, with its own dedicated
  // consumer. The organisation goes in the envelope, NEVER in the payload, like everywhere else in this catalog.
  // Amounts are decimal strings. Deduplication is edge-triggered: the producer passes a deterministic id per
  // organisation and day, so while an organisation stays divergent on the same day it does not re-insert; a new
  // day, or a different difference, is a new alert.
  "accounting.reconcile.divergence_detected": z.object({
    derivedGross: z.string(), // billing: the sum of issued, partially paid and paid invoices, minus the RAW live ledger balance — never the
    // one with the degraded-mode overlay, which would feed itself back in
    glAr: z.string(), // accounting: the sum of the balances of accounts receivable
    diff: z.string(), // the difference between the two
    toleranceUsd: z.string(), // the tolerance in force, as context for whoever reads the alert
    // Reconciliation was widened to bank and customer-advance accounts. These four fields are ADDITIVE — they break
    // no existing consumer that only reads the first three — and they let the alert say WHICH account diverged,
    // rather than only receivables. The global `isDivergent` means divergent in ANY of the three; without these
    // fields a reader could not tell "receivables diverged" from "only the other two did".
    bankDiff: z.string().optional(),
    bankDivergent: z.boolean().optional(),
    customerAdvanceDiff: z.string().optional(),
    customerAdvanceDivergent: z.boolean().optional(),
  }),
  // Emitted by the trial-ending cron when a platform trial crosses a threshold of days remaining — three days out,
  // and one day out. It had been documented for a long time as "catalogued, never implemented", without a real
  // schema entry; it is formalised here, when its producer was finally built, which is how everything in this
  // catalog works: the design specifies the shape, and the change that builds the producer adds it.
  //
  // Deduplication is edge-triggered: the id is derived from the organisation, the subscription and the threshold,
  // and `occurredAt` is the deterministic instant of the crossing. While the subscription keeps the SAME trial end
  // date it does not re-emit the same threshold; a plan change resets that date, so the id is new and a fresh
  // alert fires if a threshold is crossed again.
  //
  // The payload carries the plan's slug and NOT its price, so the consumer resolves the CURRENT name and price
  // when it renders the email, instead of trusting a snapshot that may be stale. The consumer is notifications,
  // emailing the owner directly — never the customer messaging package.
  //
  // Scope for now: three days and one day only. The 'expired' threshold the design also describes is left out —
  // the read-only degradation at expiry is already settled, and a third "your trial ended" email is later work.
  "platform.subscription.trial_ending": z.object({
    subscriptionId: z.string(), // the payment provider's subscription id, for correlation — not personal data
    planSlug: z.string(), // 'growth', 'scale', … — the consumer resolves the current name and price itself
    thresholdTier: z.enum(["day_3", "day_1"]),
    trialEndsAt: z.string(), // ISO-8601
  }),
  // ADR-N205 (2026-09-21) — the seven-day grace period and the downgrade to Free. Emitted by the daily grace sweep,
  // edge-triggered with deterministic dedup like `trial_ending`:
  //   · `grace_notice`: the notice to the owner on day 0 (the payment failed), 3 and 6 of the grace period — `day` says
  //     which one, and `graceUntil` is the deadline the email shows;
  //   · `downgraded_to_free`: the org moved to Free — `previousPlanSlug` where it came from, `reason` why (the grace
  //     period ran out, or the paid period of a cancellation ran out). The data stays; the modules Free doesn't
  //     include stay closed.
  // Consumer: Notifications #9 (Resend email to the owner, same path as `trial_ending`). `organizationId` travels in
  // the envelope, never in the payload. No prices in the payload: the consumer resolves them from the catalog on send.
  "platform.subscription.grace_notice": z.object({
    subscriptionId: z.string(),
    planSlug: z.string(),
    day: z.union([z.literal(0), z.literal(3), z.literal(6)]),
    graceUntil: z.string(), // ISO-8601
  }),
  "platform.subscription.downgraded_to_free": z.object({
    subscriptionId: z.string().nullable(), // null if the org never had PayPal (e.g. an `incomplete` from the backfill)
    previousPlanSlug: z.string(),
    reason: z.enum(["grace_expired", "canceled"]),
  }),
  // The per-customer workbench.
  //
  // `status_changed` is emitted ONLY by the domain transition function, in the same transaction as the update —
  // never by a loose call site. Without that coupling the state machine would be decorative: someone would write
  // a direct update and the event would simply not come out.
  "fiilz.piece.status_changed": z.object({
    pieceId: z.string().uuid(),
    from: z.string(),
    to: z.string(),
  }),
  // `inheritedOpenThreads` and `reanchored` are the METRIC, not decoration: how many comments were still open when
  // the version went up, and how many of them kept their anchor. If the first climbs and never falls, the team is
  // piling up unresolved complaints — which is exactly the problem this module attacks.
  "fiilz.version.created": z.object({
    pieceId: z.string().uuid(),
    versionId: z.string().uuid(),
    versionNo: z.number().int(),
    sourceKind: z.enum(["upload", "figma"]),
    inheritedOpenThreads: z.number().int(),
    reanchored: z.number().int(),
  }),
  "fiilz.version.decided": z.object({
    pieceId: z.string().uuid(),
    versionId: z.string().uuid(),
    approverUserId: z.string().uuid(),
    decision: z.enum(["approved", "changes_requested"]),
  }),
  // The bridge to money. A completed milestone is the ONLY billable event of the module, and it is emitted ONLY by
  // the domain gate, after a conditional update against the pending states: the idempotency lock lives in the
  // DATABASE, not in the consumer — the relay retries, and two deliveries would read the same state through an
  // in-memory check.
  //
  // Mind the event this is NOT: an approval decision with `decision='approved'` does NOT mean the piece was
  // approved. It is published for EACH approver and BEFORE the version's outcome is computed, so with two
  // approvers a money consumer wired to it would bill on HALF an approval. The consolidated fact is the piece's
  // status change to approved.
  //
  // `amount` travels as a STRING: a JavaScript float does not represent cents, and this number ends up on an
  // invoice. Everything else — the customer's name, the description — the consumer resolves live under row-level
  // security: the payload carries no personal data.
  "fiilz.milestone.completed": z.object({
    milestoneId: z.string().uuid(),
    projectId: z.string().uuid(),
    pieceCount: z.number().int(),
    amount: z.string(),
    currency: z.string(),
    closedBy: z.enum(["pieces", "manual"]),
  }),
  // Reopening does NOT reverse money: it warns. `wasBilled` separates the two worlds — reopening something
  // unbilled is everyday routine; reopening something already charged is a conversation with the customer.
  "fiilz.milestone.reopened": z.object({
    milestoneId: z.string().uuid(),
    pieceId: z.string().uuid(),
    wasBilled: z.boolean(),
  }),
  // ARCHIVING ALSO MOVES A MILESTONE, and for a long time it did not. The design said so in writing — "archiving
  // the last pending piece can complete the milestone, which is why archiving inside a milestone WARNS instead of
  // doing it quietly" — but archiving was a plain update with no event: archiving the last pending piece left the
  // charge pending FOREVER, with nothing left to re-evaluate it.
  //
  // The event covers archiving AND unarchiving, because both change the set of live pieces in the milestone,
  // which is exactly what the evaluation measures. Unarchiving an unapproved piece into an already-completed
  // milestone does not reopen it — that remains the business of a change request — but it does put back into the
  // set a piece that now counts.
  "fiilz.piece.archived": z.object({
    pieceId: z.string().uuid(),
    archived: z.boolean(),
  }),
  // — the internal-operations half — payloads with ONLY ids and enums. A task's personal data lives encrypted
  // with the task itself, and the consumer resolves it live. `actor` separates a human delegation from the
  // agent's. The organisation travels in the envelope, never in the payload.
  "team.task.created": z.object({
    taskId: z.string().uuid(),
    clientId: z.string().uuid().nullable(),
    actor: z.enum(["human", "agent"]),
    sourceKind: z.enum(["manual", "triage", "support", "fiilz"]),
  }),
  "team.task.assigned": z.object({
    taskId: z.string().uuid(),
    assigneeUserId: z.string().uuid(),
    previousAssigneeUserId: z.string().uuid().nullable(), // null on the first assignment
    actor: z.enum(["human", "agent"]),
  }),
  "team.task.completed": z.object({
    taskId: z.string().uuid(),
  }),
  "team.task.canceled": z.object({
    taskId: z.string().uuid(),
  }),
  // The seven events of a contract's lifecycle. The payload is deliberately MINIMAL: no personal data at all, only
  // ids and closed keys of the current vocabulary — never names or email addresses. Whoever needs the detail reads
  // it from the contract tables under row-level security, not from the event.
  //
  // Their producers are built by later parts of the plan: sealing and sending, the customer's own view and
  // signature (and execution outright, when the template needs only the customer), the tenant's counter-signature
  // and the completion that follows it — the execution timestamp is written ONCE, there and nowhere else —
  // declining and voiding, which are terminal, and the sweep that expires them.
  //
  // Documented consumers: notifications, for all seven, and the CRM for sent, executed and declined, as activity
  // on the customer's record. The CRM side is DEFERRED on purpose — a decision, not a silent hole. None has a
  // handler yet.
  "contracts.contract.sent": z.object({ contractId: z.string().uuid(), rootId: z.string().uuid(), version: z.number().int() }),
  "contracts.contract.viewed": z.object({ contractId: z.string().uuid(), signerId: z.string().uuid() }),
  "contracts.contract.signed": z.object({ contractId: z.string().uuid(), signerId: z.string().uuid(), role: z.enum(["client", "tenant"]) }),
  // The ONE trigger for billing a contract. Idempotent by ROOT and never by version: a new version of the SAME
  // root, once executed, never bills again.
  "contracts.contract.executed": z.object({ contractId: z.string().uuid(), rootId: z.string().uuid() }),
  // `reason` is a closed key enforced by a database constraint: a disagreement with the terms, incorrect details,
  // a change of mind, or other.
  "contracts.contract.declined": z.object({ contractId: z.string().uuid(), signerId: z.string().uuid(), reason: z.string() }),
  "contracts.contract.expired": z.object({ contractId: z.string().uuid() }),
  // `reason` is a closed key enforced by a database constraint: superseded, requested by the client, a data error,
  // or other.
  "contracts.contract.voided": z.object({ contractId: z.string().uuid(), reason: z.string() }),
  // The customer portal. A guest's access was removed: by the time this is emitted the permission is already
  // soft-deleted and their sessions are cut. The organisation and the actor travel in the ENVELOPE — `publish`
  // takes them from the transaction's tenant context — never in the payload, as everywhere else in this catalog.
  // `clientId` is nullable: you can revoke a guest who never activated their invitation.
  "portal.guest.revoked": z.object({
    guestId: z.string().uuid(),
    clientId: z.string().uuid().nullable(),
  }),
  // B10 — emitted by Iiko when an entry goes live on the site. **The payload is the id and the locale, not the
  // entry itself**: the event announces a fact and says where to look. Carrying the body would turn it into a
  // second copy of the entry that goes stale the moment someone edits it, and into an event that grows without
  // bound along with the piece's markdown.
  //
  // `locale` is there because **publishing is ATOMIC ACROSS LANGUAGES** (§B10 step 4): Iiko does not publish an
  // entry until it exists in both, so this event fires once per language and whoever rebuilds a feed knows which
  // one is theirs. Without it, a consumer would have to guess which file to invalidate.
  //
  // CONSUMER: `developers.niiko.org` (SP-12), which regenerates its static feed on receiving this. While that
  // consumer is not wired up, the event is emitted all the same — a fact with no listener is still the fact, and
  // a producer that waits for an audience is the one nobody ends up writing.
  "iiko.entry.published": z.object({
    entryId: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    locale: z.enum(["es", "en"]),
    kind: z.enum(["release", "note"]),
  }),
} as const satisfies Record<string, z.ZodType>;

export type EventName = keyof typeof eventCatalog;
export type EventPayload<N extends EventName> = z.infer<(typeof eventCatalog)[N]>;

/** Validates a name and payload against the catalog. Throws if the event does not exist or the payload does not
 *  satisfy it. */
export function parseEvent<N extends EventName>(name: N, payload: unknown): EventPayload<N> {
  const schema = eventCatalog[name];
  if (!schema) throw new Error(`Unknown event, not in the catalog: ${String(name)}`);
  return schema.parse(payload) as EventPayload<N>;
}
