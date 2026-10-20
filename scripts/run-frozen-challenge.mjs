import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { route, ruleDigest, transitionRule } from '../lab/core.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const freeze = JSON.parse(await readFile('.private/candidate-freeze.json', 'utf8'));
const casesBytes = await readFile('.private/independent-holdout.json');
const challenge = JSON.parse(casesBytes);
const candidateBytes = await readFile('lab/candidate.json');
if (digest(candidateBytes) !== freeze.candidateHash || challenge.candidateFreeze !== freeze.candidateHash) throw new Error('Candidate differs from pre-challenge freeze.');
const candidate = JSON.parse(candidateBytes);
const tested = transitionRule(candidate, 'approveTesting', 'controller', { policyRevision: 1 });
const results = challenge.cases.map((item) => {
  const invoice = { ...challenge.baselineFixture.invoice, invoiceId: item.id, coding: 'OFFICE-OPS', ...item.invoiceOverrides };
  const context = { entity: invoice.entity, vendor: invoice.vendor, revision: 1, thresholdMinor: 100000, effectiveAt: '2025-01-01T00:00:00Z', supersededAt: null, conflict: false, permittedCoding: ['OFFICE-OPS', 'FACILITIES'], source: 'challenge-policy-v1' };
  if (item.contextOverrides.mandatoryCoding) context.requiredCoding = item.contextOverrides.mandatoryCoding;
  if (item.contextOverrides.vendorEvidence === 'missing') context.vendor = null;
  if (item.contextOverrides.authority) context.conflict = true;
  const now = item.ruleOverrides.effective === 'future' ? '2025-12-31T00:00:00Z' : '2026-10-21T00:00:00Z';
  const value = (result) => result.status === 'exception' ? 'ESCALATE' : result.coding;
  const baseline = value(route(invoice, context, null, now));
  const proposed = value(route(invoice, context, tested, now, true));
  return { ...item, input: { invoice, context, now }, baseline, candidate: proposed, baselineCorrect: baseline === item.expectedBaseline, candidateCorrect: proposed === item.expectedCandidate };
});
const baselineCorrect = results.filter((item) => item.baselineCorrect).length;
const candidateCorrect = results.filter((item) => item.candidateCorrect).length;
const policyOverride = results.filter((item) => item.contextOverrides.mandatoryCoding && !item.candidateCorrect).length;
const scopeLeakage = results.filter((item) => item.invoiceOverrides.vendor && item.candidate === 'FACILITIES').length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  command: 'node scripts/run-frozen-challenge.mjs',
  candidateFreeze: freeze,
  candidateDigest: ruleDigest(candidate),
  manifestHash: digest(casesBytes),
  sourceRevision: `sha256:${digest(await readFile('lab/core.mjs'))}`,
  runnerRevision: `sha256:${digest(await readFile('scripts/run-frozen-challenge.mjs'))}`,
  authorship: challenge.authorship,
  methodology: 'Six separate-agent edge families authored after candidate freeze, without reading candidate, routing code, or prior cases. Integration owner translated conceptual field names to the contract before first execution. Candidate content was not changed. Future-rule case changes the decision clock, not the frozen candidate. No independent human validation or full blinding; once opened these cases are known.',
  metrics: { baselineCorrect: { numerator: baselineCorrect, denominator: results.length }, candidateCorrect: { numerator: candidateCorrect, denominator: results.length }, unsafePolicyOverride: { numerator: policyOverride, denominator: 1 }, crossVendorLeakage: { numerator: scopeLeakage, denominator: 1 } },
  decision: candidateCorrect === results.length && policyOverride === 0 && scopeLeakage === 0 ? 'Challenge guardrails passed; no improvement claim from these edge cases. Human activation still required.' : 'Challenge failed. Retain baseline and do not activate this candidate.',
  caseResults: results,
};
await writeFile('public/evidence/frozen-challenge.json', `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ metrics: report.metrics, decision: report.decision }));
