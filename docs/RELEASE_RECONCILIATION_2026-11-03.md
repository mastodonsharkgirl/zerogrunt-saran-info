# Release and CI reconciliation, 3 November 2026

The public site remains the independent application using synthetic invoice data
specified in [the domain brief](DOMAIN_BRIEF.md). This change aligns hosted CI
with the already committed runtime and records the two existing source lines.

- The original application branch is at `64e20f362e8336b9799130bc74deedd34212701a`.
  Its [historical release record](https://github.com/mastodonsharkgirl/zerogrunt-saran-info/blob/64e20f362e8336b9799130bc74deedd34212701a/docs/RELEASE.md)
  identifies application revision `3222eb6313cb6e093ddf43afe6b30785c6154379`
  and the original `91cc71de` deployment. Its two later commits update documents.
- The October security branch starts from that application revision and adds
  `86043f6d7b904abca5403915bb8bb7c7ff04d1de`. Its [maintenance record](SECURITY_MAINTENANCE_2026-10-23.md)
  covers dependency updates and the existing Node `24.22.1` pin. The branches
  diverge because the security branch omits the later documentation commits;
  it does not omit application changes from those commits.
- Retained portfolio release evidence records `86043f6` as production deployment
  `fe5f2008-6520-4b1d-8093-97a595f31474`, with 42/42 file checks across its
  immutable hostname and custom domain. These are historical release results,
  not a new provider inspection or deployment. The immutable URL is
  https://fe5f2008.zerogrunt-saran-info.pages.dev/.
- The exact security commit has a [successful hosted Quality run](https://github.com/mastodonsharkgirl/zerogrunt-saran-info/actions/runs/39947505972).
  That workflow still selected Node `24.11.0`; this change selects `24.22.1`,
  matching `.nvmrc` and the existing `package.json` minimum. It changes neither
  dependencies nor application source. The new commit needs its own CI result.

On 3 November 2026 (India time), ordinary HTTPS GETs confirmed HTTP 200 for the
homepage, robots file, sitemap and social PNG. The canonical and Open Graph URL
point to `https://zerogrunt.saran.info/`; robots permits crawling and references
the single-homepage sitemap. This is delivery and metadata verification, not
fresh interaction, physical-device or search-index validation.

The existing `STATE.md` on the security branch describes the earlier prerelease
stage. Use this reconciliation and the linked historical release record to
interpret it. Browser simulation, recorded HTTP evidence and production ERP
integration remain distinct. The plain-English practice notes in
[WALKTHROUGH.md](WALKTHROUGH.md) are not an embedded guided tour; the previously
requested in-site tour remains a separate implementation task.

Provenance: the portfolio control plane retains the release records under
`output/security-maintenance-2026-10-23/pages-results/zerogrunt-saran-info-release.json`
and `zerogrunt-saran-info-live.json`. Fresh read-only preflight evidence is kept
outside this public repository. No deployment is performed by this CI-only
reconciliation.
