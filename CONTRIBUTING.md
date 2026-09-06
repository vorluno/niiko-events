# Contributing

**Every file in this repository is generated. A pull request against one cannot be merged, even when
it is right.**

The events are defined in the private monorepo where they are also produced and consumed, and this
repository is a published copy of that definition. The next generation run overwrites whatever is
here, so a change made in this repository would be silently undone — which is a worse outcome than
being told no.

**What to do instead**

- **Something is wrong, or a comment describes behaviour that no longer matches.** Tell us at
  **contacto@vorluno.dev**, or open an issue on any of our repositories that accepts them. This is
  genuinely useful: a comment that has drifted from the code is the defect this publication exists to
  avoid.
- **A vulnerability.** **security@vorluno.dev**, never an issue. See [SECURITY.md](./SECURITY.md), where
  the 72-hour acknowledgement is the one response time we commit to.
- **You want an event you can rely on.** Say which one and what you are building. An event with a
  documented consumer outside the company is an event we cannot change casually — that is worth
  knowing on both sides.

Issues are off here for the same reason: an issue opened against a generated file lands in a
repository whose maintainer does not read it, and silence would be the answer. We would rather send
you somewhere that answers.
