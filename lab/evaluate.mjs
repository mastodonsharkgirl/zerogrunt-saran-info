import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { route, ruleDigest, transitionRule } from './core.mjs';
import { evaluateCandidate } from './evaluation-engine.mjs';

const fixtureBytes = readFileSync(new URL('./fixtures.json', import.meta.url));
const candidateBytes = readFileSync(new URL('./candidate.json', import.meta.url));
const cases = JSON.parse(fixtureBytes); const original = JSON.parse(candidateBytes);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const manifestHash = sha(fixtureBytes); const candidateHash = sha(candidateBytes);
const approved = transitionRule(original, 'approveTesting', 'controller', {policyRevision:1});
const rule = approved;
const now = '2026-10-21T00:00:00Z';
const results = cases.map((item) => {
  const invoice = {entity:item.entity,vendor:'PAPERCARE-01',invoiceId:item.id,amountMinor:125000,currency:'INR',purpose:item.purpose,coding:'OFFICE-OPS'};
  const context = {entity:item.entity,vendor:invoice.vendor,thresholdMinor:100000,revision:1,effectiveAt:'2026-01-01T00:00:00Z',supersededAt:item.purpose === 'policy-superseded' ? '2026-10-01T00:00:00Z' : null,conflict:item.purpose === 'conflict',permittedCoding:['OFFICE-OPS','FACILITIES'],source:'synthetic-policy-v1'};
  const value = (result) => result.status === 'exception' ? 'ESCALATE' : result.coding;
  const baseline = value(route(invoice,context,null,now));
  const candidate = value(route(invoice,context,item.inactive ? {...rule,state:'withdrawn'} : rule,now,true));
  return {...item, baseline, candidate, baselineCorrect:baseline === item.expected, candidateCorrect:candidate === item.expected};
});
const summarize = (split, field) => {
  const selected = results.filter((item) => item.split === split); const answerable = selected.filter((item) => item.expected !== 'ESCALATE'); const escalation = selected.filter((item) => item.expected === 'ESCALATE');
  return {routingCorrect:{numerator:answerable.filter((item) => item[field] === item.expected).length,denominator:answerable.length},appropriateEscalation:{numerator:escalation.filter((item) => item[field] === 'ESCALATE').length,denominator:escalation.length},unnecessaryEscalation:{numerator:answerable.filter((item) => item[field] === 'ESCALATE').length,denominator:answerable.length},scopeLeakage:{numerator:selected.filter((item) => item[field] !== item.baseline && (item.entity !== rule.scope.entity || item.purpose !== rule.scope.purpose)).length,denominator:selected.length}};
};
const splits = ['development','known-holdout-replay'];
const metrics = Object.fromEntries(['baseline','candidate'].map((field) => [field,Object.fromEntries(splits.map((split) => [split,summarize(split,field)]))]));
const evaluation = evaluateCandidate(approved,now); const eligible = evaluation.eligible;
const evaluated = transitionRule(approved,'evaluate','reviewer',evaluation);
const sourceRevision = createHash('sha256').update(readFileSync(new URL('./evaluate.mjs',import.meta.url))).update(readFileSync(new URL('./evaluation-engine.mjs',import.meta.url))).update(readFileSync(new URL('./core.mjs',import.meta.url))).digest('hex');
const report = {schemaVersion:1,generatedAt:new Date().toISOString(),command:'node lab/evaluate.mjs',sourceRevision:`working-tree-sha256:${sourceRevision}`,manifestHash,candidateHash,candidateDigest:ruleDigest(original),evaluation,fixtureAuthor:'Synthetic fixtures and candidate authored by the same implementation team.',candidate:evaluated,decision:eligible ? 'eligible for separate activation review' : 'rejected',limitations:'Previously opened cases are known replay, not fresh held-out validation. Several replay families are related to development cases. This policy-only experiment makes no ERP writes or model-quality measurement.',splits:{teaching:1,development:5,'known-holdout-replay':6},metrics,caseResults:results};
mkdirSync('public/evidence',{recursive:true}); writeFileSync('public/evidence/evaluation.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify({manifestHash,candidateHash,decision:report.decision,metrics}));
