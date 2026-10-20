export const proposalSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['costCenter', 'sourceIds', 'reason'],
  properties: {
    costCenter: { type: 'string', enum: ['OFFICE-OPS', 'FACILITIES', 'REVIEW'] },
    sourceIds: { type: 'array', minItems: 1, items: { type: 'string', enum: ['policy-v1', 'vendor-v1'] } },
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
};

export function validateProposal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { valid: false, reason: 'Expected a JSON object.' };
  const keys = Object.keys(value).sort();
  if (keys.join(',') !== 'costCenter,reason,sourceIds') return { valid: false, reason: 'Unexpected or missing properties.' };
  if (!proposalSchema.properties.costCenter.enum.includes(value.costCenter)) return { valid: false, reason: 'Cost center is outside the allowlist.' };
  if (!Array.isArray(value.sourceIds) || value.sourceIds.length < 1 || !value.sourceIds.every((source) => ['policy-v1', 'vendor-v1'].includes(source))) return { valid: false, reason: 'Sources must identify supplied records.' };
  if (typeof value.reason !== 'string' || value.reason.length < 1 || value.reason.length > 500) return { valid: false, reason: 'Reason must be 1–500 characters.' };
  return { valid: true, reason: 'Schema and source allowlist passed. Proposal only; no authority to post.' };
}

export function checkPolicy(proposal, policy) {
  const passed = validateProposal(proposal).valid && proposal.costCenter === policy.maintenanceCoding;
  return { expectedCoding: policy.maintenanceCoding, actualCoding: proposal?.costCenter ?? null, passed, decision: passed ? 'Await human approval' : 'Hold for human review: proposal conflicts with maintenance policy' };
}
