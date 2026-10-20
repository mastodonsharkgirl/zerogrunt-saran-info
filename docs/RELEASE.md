# Release evidence

Released 2026-10-21 (India time).

## Published application

- Live: https://zerogrunt.saran.info/
- Stable preview: https://zerogrunt-saran-info.pages.dev/
- Immutable deployment: https://91cc71de.zerogrunt-saran-info.pages.dev/
- Application revision: `3222eb6313cb6e093ddf43afe6b30785c6154379`.
- Public repository: https://github.com/mastodonsharkgirl/zerogrunt-saran-info
- Branch: `codex/zerogrunt-application`.
- Passing hosted check: https://github.com/mastodonsharkgirl/zerogrunt-saran-info/actions/runs/39482920316

The later handoff commit changes documentation only. The application revision
above identifies the tested and deployed website, rather than implying that
every subsequent documentation revision was separately deployed.

## Checks performed

`npm run qa` passed on the application revision:

- Astro/TypeScript: zero errors, warnings or hints.
- Node tests: 25 passed (21 workflow/lab and four model-contract checks).
- Static production build completed.
- Chromium interaction tests: five passed, covering policy invalidation,
  receipt recovery, correction/testing/activation/withdrawal, presentation mode,
  keyboard focus, narrow-screen layout and recorded evidence.
- The same five tests passed against the deployed custom hostname, including
  a final run with normal system DNS and no resolver override.
- All 21 served files matched the local production build byte for byte,
  including JavaScript, CSS, fonts, social image and four evidence reports.

Rendered desktop, tablet and mobile review covered 320, 360, 390, 768 and
1440-pixel widths. Final live screenshots were captured at 1440x900 and
390x844, with reduced motion. No document-level overflow or page/console
errors were observed in the reviewed scenarios. Automated accessibility
checks are scoped checks, not full accessibility certification.

The current public portfolio homepage and two linked case-study routes
returned HTTP 200. The contact action uses the LinkedIn URL published by that
homepage; its old `#contact` fragment was removed. No message was sent.

## DNS and HTTPS boundary

Cloudflare reports the custom hostname, verification and validation active.
Only `zerogrunt` was added as a proxied CNAME to
`zerogrunt-saran-info.pages.dev`; four existing zone records were preserved.
Public DNS resolvers return the Cloudflare addresses. HTTPS for the custom
hostname serves the correct site with normal certificate validation.

This machine's default resolver initially returned `ENOTFOUND` during the
release checks. Consequently, the initial custom-domain tests and file comparison
used a per-process Chromium resolver override to the publicly resolved address
`172.67.171.244`. TLS verification was not disabled. System DNS and hosts were
not changed. The cache subsequently cleared: system DNS resolved normally and
all five custom-domain browser tests passed again without any override.
All 21 files were then compared again using normal system DNS with zero
mismatches; plain HTTP redirected with 301 and the recovery deep link returned 200.
The Pages preview also passed interaction and delivery checks without that
override on the earlier release. It remains a fallback for resolver delays.

Local evidence is retained under ignored `.private/`: `live-delivery.json`, `custom-delivery.json`,
`live-test-results.json` and `screenshots/live-*.png`. DNS-dashboard evidence
stays private, not in the public build.

## What the experiments establish

- The recorded local HTTP run recovered the committed invoice after a lost
  response and process restart, with one matching posting and no duplicate.
  A separate transient-response scenario exercises real 503/Retry-After.
- Original synthetic cases are a known replay, not unseen validation.
- The frozen six-case challenge was authored by a separate QA agent after
  freezing the candidate. Both baseline and candidate passed 6/6. This is
  evidence about those guardrails, not a measured improvement or production
  generalization. No tuning followed that challenge.
- Two actual local model proposals were well-formed but both contradicted the
  supplied maintenance-coding policy. Both stayed held for human review.

The public browser lab is an in-memory simulation, separate from those local
process experiments. This release establishes neither live ERP integration nor
accounting accuracy at scale. Physical Android, in-app browser behavior and
actual operator use remain unverified.
