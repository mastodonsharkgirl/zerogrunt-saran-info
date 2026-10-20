import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProposal, checkPolicy } from '../../scripts/model-contract.mjs';

test('proposal accepts only an allowlisted coding and supplied source', () => {
  assert.equal(validateProposal({ costCenter: 'FACILITIES', sourceIds: ['policy-v1'], reason: 'Maintenance scope.' }).valid, true);
});

test('model output cannot add approval, endpoint or policy instructions', () => {
  for (const extra of ['approved', 'endpoint', 'policy']) {
    assert.equal(validateProposal({ costCenter: 'FACILITIES', sourceIds: ['policy-v1'], reason: 'Maintenance.', [extra]: true }).valid, false);
  }
});

test('unknown coding, invented source and malformed responses are rejected', () => {
  for (const response of [null, 'approved', { costCenter: 'ADMIN', sourceIds: ['policy-v1'], reason: 'x' }, { costCenter: 'FACILITIES', sourceIds: ['invented'], reason: 'x' }, { costCenter: 'FACILITIES', sourceIds: [], reason: 'x' }]) {
    assert.equal(validateProposal(response).valid, false);
  }
});

test('well formed model output conflicting with authoritative coding remains held', () => {
  const proposal = { costCenter: 'OFFICE-OPS', sourceIds: ['policy-v1'], reason: 'Default code.' };
  assert.equal(validateProposal(proposal).valid, true);
  assert.equal(checkPolicy(proposal, { maintenanceCoding: 'FACILITIES' }).passed, false);
  assert.match(checkPolicy(proposal, { maintenanceCoding: 'FACILITIES' }).decision, /Hold for human review/);
});
