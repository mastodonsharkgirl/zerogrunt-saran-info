# State

Updated 2026-10-21.

Implemented, reviewed and published. See [release evidence](docs/RELEASE.md)
for the tested application revision, deployment and verification boundaries.

- Public application: https://zerogrunt.saran.info/
- Fallback preview: https://zerogrunt-saran-info.pages.dev/
- Source: https://github.com/mastodonsharkgirl/zerogrunt-saran-info
- Branch: `codex/zerogrunt-application`.

The browser demonstration is an in-memory simulation. The retained HTTP
experiment uses separate local Node/Python processes and SQLite stores.
Neither connects to a real ERP. No visitor data, external model API or
employer information is collected.

Review repaired durable rule lifecycle, store identity, crash recovery,
malformed approval/retry records and receipt uniqueness. Final review found
no remaining P0/P1 issue within the reviewed scope.

The original synthetic evaluation is a known replay, not unseen validation.
A candidate was frozen before a separate QA agent authored six new challenge
cases. Baseline and candidate both matched 6/6 expectations: a guardrail result,
not an improvement. No candidate tuning followed the challenge.

Two actual local Qwen3 1.7B proposals passed schema validation but both got
the supplied maintenance policy wrong. Both remain held for human review.
Raw responses are retained; no success was substituted.

Only the requested `zerogrunt` CNAME was added. Existing DNS records and
parent-workspace changes were preserved. Cloudflare reports the custom domain,
validation and verification active. Public DNS resolves; this machine's
default resolver initially returned a cached negative answer during verification.
Initial custom-domain checks used a per-process public-address override with
normal TLS certificate validation. DNS subsequently resolved normally, and all
five live browser tests passed again without the override. No system DNS or
hosts settings changed.

Nothing was sent to Saurav, ZeroGrunt or any other recipient. Physical Android
and in-app browser checks remain manual follow-up, not claimed as completed.
