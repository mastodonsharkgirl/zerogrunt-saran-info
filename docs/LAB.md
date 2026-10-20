# Invoice lab

Run from the project root with Node 24 and Python 3:

```sh
node --test tests/lab/*.test.mjs
node lab/record.mjs
node lab/evaluate.mjs
```

`record.mjs` creates temporary relay and mock-ERP SQLite files and starts a Python loopback service. It verifies that an unapproved admission is rejected and the ERP count stays unchanged. For the approved invoice, the ERP commits then deliberately drops the response. A fresh Node process reads the saved receipt and checks its invoice, identity, digest and store. The script also submits an identical duplicate and a changed amount under the same identity. A separate invoice and relay store then exercise a 503 with Retry-After, a blocked early retry, a due retry and receipt readback. Temporary stores are removed afterwards. `public/evidence/http-run.json` contains the actual bounded run and file hash; it is not a live integration or an exactly-once guarantee.

`evaluate.mjs` reads a 12-case synthetic manifest and a separate candidate file: one teaching example, five development cases and six previously opened cases. Baseline and candidate execute the same routing function on the same inputs. Candidate and fixture hashes are recorded. The same author made the cases and candidate, and related cases appear across splits; the previously opened cases are known replay, not fresh held-out validation. Routing metrics count only cases requiring a coding answer; escalation metrics use the relevant answerable or exception denominators. Individual outcomes and reasons are retained. The policy-only experiment does not make ERP writes; transport results belong to the separate HTTP report. An eligible evaluation does not itself activate a rule.

Approvals bind the exact invoice digest, actor, expiry and context/rule revisions. Admission checks these in a SQLite transaction before reserving a write. An admitted request cannot be recalled by later revocation. An uncertain result requires a matching saved receipt or a request-correlated absence; only transient outcomes can reserve a later retry, with bounded attempts, backoff and Retry-After. The recorded sequence explicitly invokes the retry; there is no background worker. A correction updates the unposted invoice and invalidates its approval. Candidate lifecycle events and revisions persist in the relay store; activation and withdrawal invalidate pending approvals. Neither reverses a posted invoice. This experiment does not implement full production authorization, durable multi-tenant isolation, or safe autonomous handling of every failure.
