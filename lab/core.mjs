import { createHash } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex');
export const canonical = (invoice) => JSON.stringify([invoice.entity, invoice.vendor, invoice.invoiceId, invoice.amountMinor, invoice.currency, invoice.purpose, invoice.coding]);
export function identify(invoice) {
  const businessKey = JSON.stringify([invoice.entity, invoice.vendor, invoice.invoiceId]);
  return { businessKey, key: hash(JSON.stringify(['invoice-lab-v1', invoice.entity, invoice.vendor, invoice.invoiceId])), digest: hash(canonical(invoice)) };
}
export function decide(invoice, context, actor, now) {
  if (actor !== 'operator' || !context || context.entity !== invoice.entity || context.vendor !== invoice.vendor || context.conflict || !context.source || !Number.isSafeInteger(context.revision) || !Number.isSafeInteger(context.thresholdMinor) || context.thresholdMinor < 0 || !Array.isArray(context.permittedCoding) || !context.permittedCoding.includes(invoice.coding) || !Number.isSafeInteger(invoice.amountMinor) || invoice.amountMinor <= 0 || invoice.currency !== 'INR' || !Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(context.effectiveAt)) || Date.parse(context.effectiveAt) > Date.parse(now) || (context.supersededAt && (!Number.isFinite(Date.parse(context.supersededAt)) || Date.parse(context.supersededAt) <= Date.parse(now)))) return { status: 'exception', reason: 'missing, conflicting, inactive or unauthorized context' };
  if (context.requiredCoding !== undefined && (!context.permittedCoding.includes(context.requiredCoding) || invoice.coding !== context.requiredCoding)) return {status:'exception',reason:'proposal conflicts with mandatory policy coding'};
  return { status: 'proposed', approver: invoice.amountMinor > context.thresholdMinor ? 'controller' : 'operator', contextRevision: context.revision, coding: invoice.coding };
}
export function validateReceipt(receipt, invoice, storeId) {
  if (!receipt || typeof receipt !== 'object' || !receipt.invoice) return false;
  const receiptKeys = ['schemaVersion','invoice','businessKey','idempotencyKey','payloadDigest','receiptId','committedAt','storeId'];
  const invoiceKeys = ['entity','vendor','invoiceId','amountMinor','currency','purpose','coding'];
  if (Object.keys(receipt).length !== receiptKeys.length || !receiptKeys.every((key) => Object.hasOwn(receipt, key)) || Object.keys(receipt.invoice).length !== invoiceKeys.length || !invoiceKeys.every((key) => Object.hasOwn(receipt.invoice, key))) return false;
  const expected = identify(invoice);
  return receipt.schemaVersion === 1 && receipt.storeId === storeId && typeof receipt.receiptId === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(receipt.receiptId) && typeof receipt.committedAt === 'string' && Number.isFinite(Date.parse(receipt.committedAt)) && receipt.businessKey === expected.businessKey && receipt.idempotencyKey === expected.key && receipt.payloadDigest === expected.digest && canonical(receipt.invoice) === canonical(invoice);
}
export function correction(invoice, correctedCoding, actor, reason, proposeRule) {
  if (!['operator','controller'].includes(actor) || !reason || !['OFFICE-OPS', 'FACILITIES'].includes(correctedCoding)) throw Error('Invalid correction');
  const event = { priorProposal: invoice.coding, correctedCoding, actor, reason, at: new Date().toISOString(), sourceExample: invoice.invoiceId, scope: { entity: invoice.entity, vendor: invoice.vendor, purpose: invoice.purpose } };
  return { ...event, candidate: proposeRule ? { version: 1, state: 'proposed', scope: event.scope, coding: correctedCoding, provenance: event.sourceExample, effectiveAt: event.at, effectiveUntil:null, policyRevision:1 } : null };
}
export function ruleApplies(rule, invoice, now = new Date().toISOString()) {
  return Boolean(rule && rule.state === 'active' && rule.eligible === true && rule.approvedDigest === ruleDigest(rule) && rule.evaluatedDigest === ruleDigest(rule) && Date.parse(rule.effectiveAt) <= Date.parse(now) && (!rule.effectiveUntil || Date.parse(rule.effectiveUntil) > Date.parse(now)) && rule.scope.entity === invoice.entity && rule.scope.vendor === invoice.vendor && rule.scope.purpose === invoice.purpose);
}
export function ruleDigest(rule) { return hash(JSON.stringify([rule.version, rule.scope.entity, rule.scope.vendor, rule.scope.purpose, rule.coding, rule.provenance, rule.effectiveAt, rule.effectiveUntil, rule.policyRevision])); }
export function transitionRule(rule, action, actor, evaluation) {
  const roles = {approveTesting:'controller',evaluate:'reviewer',activate:'controller',reject:'controller',withdraw:'controller'};
  if (roles[action] !== actor) throw Error('Actor not permitted for this decision');
  const transitions = { approveTesting: ['proposed', 'approved_for_testing'], evaluate: ['approved_for_testing', 'evaluated'], activate: ['evaluated', 'active'], reject: ['evaluated', 'rejected'] };
  if (action === 'withdraw' && ['proposed', 'approved_for_testing', 'evaluated', 'active'].includes(rule.state)) return { ...rule, state:'withdrawn', lastActor:actor };
  const transition = transitions[action];
  if (!transition || rule.state !== transition[0]) throw Error('Invalid rule transition');
  const digest = ruleDigest(rule);
  if (action === 'approveTesting' && (!evaluation || !Number.isSafeInteger(evaluation.policyRevision) || rule.policyRevision !== evaluation.policyRevision)) throw Error('Matching policy revision required');
  if (action === 'evaluate') { const {evaluationId, ...result} = evaluation ?? {}; if (!evaluation || typeof evaluation.eligible !== 'boolean' || rule.approvedDigest !== digest || evaluation.candidateDigest !== digest || evaluation.policyRevision !== rule.policyRevision || typeof evaluation.manifestHash !== 'string' || evaluationId !== hash(JSON.stringify(result))) throw Error('Matching testing approval and evaluation required'); }
  if (action === 'activate' && (rule.eligible !== true || rule.evaluatedDigest !== digest || !evaluation || evaluation.policyRevision !== rule.policyRevision || evaluation.evaluationId !== rule.evaluationId)) throw Error('Candidate did not qualify, changed, or evaluation differs');
  return { ...rule, state:transition[1], lastActor:actor, ...(action === 'approveTesting' ? {approvedDigest:digest, policyRevision:evaluation.policyRevision} : {}), ...(action === 'evaluate' ? {eligible:evaluation.eligible, evaluatedDigest:digest, evaluationId:evaluation.evaluationId, manifestHash:evaluation.manifestHash} : {}) };
}
export function route(invoice, context, rule, now, sandbox = false) {
  const decision = decide(invoice, context, 'operator', now);
  if (decision.status !== 'proposed' || !invoice.purpose || ['ambiguous','missing','conflict','policy-superseded'].includes(invoice.purpose)) return {status:'exception', coding:null};
  const testing = sandbox && rule?.state === 'approved_for_testing' && rule.approvedDigest === ruleDigest(rule) && rule.policyRevision === context.revision && Date.parse(rule.effectiveAt) <= Date.parse(now) && (!rule.effectiveUntil || Date.parse(rule.effectiveUntil) > Date.parse(now)) && rule.scope.entity === invoice.entity && rule.scope.vendor === invoice.vendor && rule.scope.purpose === invoice.purpose;
  const applies = (testing || (ruleApplies(rule, invoice, now) && rule.policyRevision === context.revision)) && context.permittedCoding.includes(rule.coding);
  if (applies && context.requiredCoding !== undefined && context.requiredCoding !== rule.coding) return {status:'exception',coding:null,reason:'candidate conflicts with mandatory policy coding'};
  return {...decision, coding: applies ? rule.coding : decision.coding};
}
