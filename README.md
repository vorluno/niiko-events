# niiko-events

> The event catalog of [niiko](https://niiko.org): every event defined once, with its payload schema.

[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
[![types](https://img.shields.io/badge/types-included-blue)](#)
[![generated](https://img.shields.io/badge/source-generated-blue)](#how-this-repository-works)

**This repository is generated and read-only.** It is published so that anyone integrating with niiko
can read the exact shape of every event it emits, including the ones that are catalogued before their
producer exists. Issues are off; see [how this repository works](#how-this-repository-works).

## What is here

| File | What it holds |
|---|---|
| `src/catalog.ts` | Every event, by name, with its payload schema. One definition, no ad-hoc events. |
| `src/envelope.ts` | What accompanies every payload: actor, causal chain, trace context, timestamps. |
| `src/sse.ts` | Which events reach a screen in real time, and how they are filtered per organisation. |
| `src/presence.ts` | The ephemeral per-conversation channel — typing, and the draft shadow stream. |

## How to read it

Event names are always `module.entity.action`, and the payload schema is the contract. Two things are
worth knowing before you build against it:

**The organisation is never in the payload.** It travels in the envelope, taken from the transaction's
tenant context. If you are looking for a tenant id inside an event, it is not there on purpose.

**Payloads carry ids and enums, not values.** A lead's name, an invoice's customer, the text of a
message — none of it travels on the bus. Consumers resolve what they need at the moment they need it,
under the same access rules as anyone else. So a payload that looks thin is not an oversight; it is
the design.

## Why publish a catalog nobody can install

Because the interesting part is not the code — it is **what the events say and what they refuse to
say**. Every entry carries the reasoning behind its shape: why deduplication is edge-triggered and
derived from state rather than kept in a table; why archiving a conversation deliberately does *not*
reach the real-time channel; why one event was removed because another already announced the same
fact from the right side. That is the part you cannot get from a schema dump, and it is the part worth
reading before designing your own bus.

## How this repository works

Every file here is **generated from the private monorepo where these events are defined and used**.
Editing a file in this repository has no effect: the next run overwrites it.

That is also why issues are off. A defect here is a defect upstream, and an issue opened against a
generated file would sit in a repository whose maintainer does not read it. If something is wrong —
and especially if a comment describes behaviour that no longer matches — say so at
**contacto@vorluno.dev**, or in an issue on any of our repositories that accepts them.

Vulnerabilities are the exception and always go to **security@vorluno.dev**: see
[SECURITY.md](./SECURITY.md).

## License

Apache-2.0. See [LICENSE](./LICENSE) and [AUTHORS](./AUTHORS).

---

Built by **[Vorluno](https://vorluno.dev)** — a software studio from Panamá.
