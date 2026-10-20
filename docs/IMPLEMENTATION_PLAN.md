# Implementation plan

Spec: supplied execution brief; docs/DOMAIN_BRIEF.md, docs/CONTRACT.md and DECISIONS.md.

1. Verify source baseline and store private ledger outside published assets.
2. Adapt Field Relay contracts in lab/, with deterministic core, immutable
   approvals/candidates, receiver deduplication and transactional admission.
   Write meaningful failing tests, implement, then run focused checks.
3. Freeze synthetic evaluation families before opening holdout. Run candidate
   once, retain failed outcomes, verify eligible control activation separately.
4. Run actual HTTP lost-response/restart scenario; retain sanitized trace and
   counts. Probe existing local model availability without downloading.
5. Build Astro shell and browser lab against the agreed scenario contract.
   Add presentation controls, source details and evidence-generated metrics.
6. Skeptical implementation review, repair defects, run npm run qa and inspect
   responsive screenshots and keyboard/reduced-motion behavior.
7. Commit/push isolated source, publish via verified existing hosting, verify
   exact custom domain/assets/deep links and document release state.
8. Deliver walkthrough, code paths and practice exercise.

Review focus: stale authority at admission; altered payload sharing identity;
unknown outcome on malformed readback; candidate digest editing; candidate
coverage versus escalation; browser/HTTP evidence distinction; mobile controls.
