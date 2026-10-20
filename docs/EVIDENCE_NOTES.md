# Reading the evidence

## Source inventory

Source research used current public pages and narrow local Git/artifact reads.
The private inventory is excluded from the repository and website.

- Field Relay: `origin/main` at `7d490809754bc33d4f17f94e55c59ced14a13b66`;
  repaired implementation `b9f11c5d629045589916b3dec231ff012dd94690`.
  [Contract](https://github.com/mastodonsharkgirl/field-relay/blob/main/docs/integration/CONTRACT.md),
  [release](https://github.com/mastodonsharkgirl/field-relay/blob/main/docs/INTERFACE_RELEASE_2026-10-15.md).
  Its historical tests were not added to this project's test counts.
- [Tetr Compass](https://saran.info/work/tetr-compass/): operational story and
  submission/review distinction. No claim of verified adoption or business lift.
  The later fictional RAG prototype is separate.
- [Listening Party retained results](https://saran.info/evidence/listening-party/2026-10-15/verified-results.json):
  40 development and 34 held-out synthetic, agent-authored cases.
  Three stricter policies rejected all 22 answerable development requests,
  so none reached holdout. BM25 had 18/22 held-out answerable top-three hits;
  the comparator had 19/22. That does not establish a general winner.
- [ZeroGrunt](https://www.zerogrunt.ai/): first-party invoice/P2P audience context.
  Observed colors informed an original composition. No company logo, product
  screenshot, certification badge or customer claim was reused.

## Measurements

Policy routing correctness counts cases whose expected outcome is a coding
answer, excluding escalation cases. Appropriate escalation counts expected
exceptions. Unnecessary escalation counts answerable cases unnecessarily sent
for review. Scope leakage counts changed outputs outside the candidate's
entity/purpose scope. Inspect individual rows as well as the aggregate.

HTTP metrics have different denominators: the selected lost-response scenario,
an attempted duplicate submission, and an unapproved admission attempt. They
describe these particular experiments, not a statistical production guarantee.
The transient scenario separately observes a 503, Retry-After, a rejected early
retry, a due retry and verified receipt.

`evaluation.json` contains known synthetic replay. It must never be described
as fresh held-out validation. A separate `frozen-challenge.json`, when present,
preserves a candidate freeze before a separate agent authored edge cases.
Its expectations and integration translations are visible. It is neither
independent human validation nor a fully blinded benchmark.

Software tests check implementation behavior. Neither their count nor a
passing build measures model quality.

## Model result

The already-installed local `qwen3:1.7b` ran twice through
[Ollama's chat API](https://docs.ollama.com/api/chat). The prompts, source fields,
raw outputs and model digest are retained. Both responses passed the JSON/source
allowlist and both conflicted with the supplied maintenance coding.

The post-run policy check holds both for review. This is a real failure in a
two-input demonstration, not an accuracy estimate. The second invoice included
an instruction to override policy; no document text or model output can grant
approval or call a payment endpoint.

The inference source hash predates the later addition of the deterministic
`checkPolicy` export to model-contract.mjs. Raw responses remain unchanged;
the policy-check record carries its own command, timestamp and source hash.

## Production gaps

This local experiment has synthetic role strings, one active invoice per relay
store and a manually driven recording sequence. A real deployment needs verified
identities and permissions, multi-tenant isolation, real ERP contracts, controlled
retention, monitoring, operational ownership, broader failure tests and a
representative evaluation set agreed with finance operators.

No backend, model, payment endpoint or customer data is hosted with this page.
