# A working case for ZeroGrunt

An independent application by Saran Vashisht. One fictional printer-maintenance
invoice explores changing business context, interrupted posting, human correction
and evaluation. Built with Codex assistance.

## Run locally

Node 24.11+ (under 26), Python 3 and npm are required.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

The browser is an in-memory simulation. It does not connect to the local ERP
experiment, store visitor data or call a model. Reload or Reset lab clears it.

```sh
npm test
npm run lab:record
npm run evaluate
npm run qa
```

The HTTP command runs a Python ERP process and fresh Node relay processes with
separate temporary SQLite stores. It captures real local HTTP results. The
evaluation command replays known synthetic policy cases. It does not run new
hidden validation. See [lab documentation](docs/LAB.md).

`npm run model:record` requires an existing local Ollama service with
`qwen3:1.7b` installed. It performs two local inferences, without downloading.
`node scripts/check-model-record.mjs` checks the retained proposals against
the supplied maintenance policy. The retained run got the coding wrong on
both inputs; passing a JSON schema was insufficient.

`public/evidence/frozen-challenge.json` preserves a separate six-case challenge
authored after the candidate freeze. Both versions matched 6/6 expectations;
that is a guardrail result, not evidence of an improvement. Its one-time runner
requires the private authorship input and refuses to overwrite the original.
Public report inputs are sufficient for a transparent known-case replay.

## Inspect the work

- [Contract](docs/CONTRACT.md): stable invoice identity and approval boundaries.
- [Adaptation](docs/ADAPTATION.md): exactly what came from Field Relay.
- [Decisions](DECISIONS.md): audience, design and architecture.
- [Walkthrough](docs/WALKTHROUGH.md): two/five-minute tour and practice exercise.
- [State](STATE.md): current release status and next action.

All example invoices, contacts and policies are fictional. This is not an ERP
connector, payment service, accounting recommendation or production guarantee.
Private source inventories and credentials are excluded from Git and the build.
