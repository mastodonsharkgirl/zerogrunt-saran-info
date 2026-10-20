import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { route, ruleDigest } from './core.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
export function evaluateCandidate(rule, now = new Date().toISOString()) {
  const bytes = readFileSync(new URL('./fixtures.json',import.meta.url));
  const cases = JSON.parse(bytes); const manifestHash = sha(bytes);
  const rows = cases.filter((item) => item.split === 'development').map((item) => {
    const invoice = {entity:item.entity,vendor:'PAPERCARE-01',invoiceId:item.id,amountMinor:125000,currency:'INR',purpose:item.purpose,coding:'OFFICE-OPS'};
    const context = {entity:item.entity,vendor:invoice.vendor,thresholdMinor:100000,revision:rule.policyRevision,effectiveAt:'2026-01-01T00:00:00Z',supersededAt:item.purpose === 'policy-superseded' ? '2026-01-02T00:00:00Z' : null,conflict:item.purpose === 'conflict',permittedCoding:['OFFICE-OPS','FACILITIES'],source:'synthetic-policy-v1'};
    const value = (result) => result.status === 'exception' ? 'ESCALATE' : result.coding;
    return {id:item.id,expected:item.expected,baseline:value(route(invoice,context,null,now)),candidate:value(route(invoice,context,rule,now,true))};
  });
  const baselineCorrect = rows.filter((row) => row.baseline === row.expected).length;
  const candidateCorrect = rows.filter((row) => row.candidate === row.expected).length;
  const eligible = candidateCorrect >= baselineCorrect && rows.every((row) => row.expected !== 'ESCALATE' || row.candidate === 'ESCALATE') && rows.every((row) => row.candidate === row.expected || row.candidate === row.baseline);
  const result = {candidateDigest:ruleDigest(rule),policyRevision:rule.policyRevision,manifestHash,rows,eligible};
  return {...result,evaluationId:sha(JSON.stringify(result))};
}
