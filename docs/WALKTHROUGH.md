# Explaining this project

Use these as practice notes, not as a claim that you already understand every
line. Read the three code paths, change something small, and explain the result
in your own words.

## Two minutes

1. Open the site and say what you chose: one ordinary printer-maintenance
   invoice, because the exceptions are easier to inspect than a broad agent demo.
2. Approve it, lower the threshold, and show that the earlier approval no longer
   covers the action.
3. Open Recovery. Lose the response and read the receipt. Expand the recorded
   HTTP run to distinguish a browser explanation from actual process evidence.
4. Point to the model result: its response was well formed but the coding was
   wrong. It still had no authority to post.
5. Show the three project links and explain why each is relevant.

## Five minutes

Use the two-minute path, then spend another minute on correction: apply it
once, propose a scoped rule, approve testing, review, activate, check another
matching invoice and an excluded purpose, then withdraw. These browser controls
are scripted explanations; the local tests verify the durable rule lifecycle.

Open the evaluation evidence. Compare exact numerators and denominators and
read a failed baseline case. Explain that the original cases are known replay,
not independent human validation. Read the separate challenge record if present;
do not merge its cases or claim that a failed candidate became successful.

Finish with the first-month proposal: observe a real finance operator, agree
on authority and review points, deliver one path, inject failures and measure
the pilot. The proposed sequence depends on actual customer access.

## Three code paths

### 1. Decision and correction — lab/core.mjs

`decide` checks authoritative context. `route` applies a scoped rule only while
its approvals, digest, policy revision and effective interval match. A digest
is a fingerprint of the exact candidate: changing its content must invalidate
earlier test and activation decisions.

The tradeoff is deliberate rigidity. It supports a few fictional policy fields,
not the variety of a real company's finance rules.

### 2. Approval and admission — lab/store.mjs

`approve` binds the invoice fingerprint, actor, expiry and policy/rule versions.
`admit` rechecks them inside one database transaction before reserving a write.
Think of it as checking the signed work order while locking the job's record,
so another change cannot slip between the check and the reservation.

A later revocation blocks future admissions. It cannot recall a request already
sent. SQLite keeps this local experiment small; production would need real
identity, stronger permissions, multiple-worker coordination and tenant isolation.

### 3. Write and readback — lab/relay.mjs and lab/erp.py

The ERP stores a posting before the connection is deliberately interrupted.
The relay restarts and asks for the receipt using the same identity. It checks
the saved payload and store identity before reporting verified.

An invoice's business identity is entity + vendor + invoice ID. Its amount
and coding belong in a separate payload fingerprint. Changing the amount must
not create another identity that allows the same invoice to post twice.

## Practice exercise

1. Find the approval threshold in `lab/store.mjs` and the relevant tests.
2. Before editing, predict which approver should handle INR 1,250 when the
   threshold changes from INR 2,000 to INR 1,000.
3. Add or adjust a focused test for that prediction; run `npm test`.
4. Change the threshold, run the test, and explain any failure.
5. Run `npm run lab:record`. Explain why “no response” does not mean “not saved.”
6. Answer without reading: why would generating a new posting identity on
   timeout make duplicate posting possible?

Practice in a local branch. Do not overwrite the published evidence while
continuing to describe it as the original run. A new candidate needs new
evaluation provenance; old held-out results cannot be inherited.
