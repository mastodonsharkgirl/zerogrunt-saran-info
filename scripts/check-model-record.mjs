import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { checkPolicy } from './model-contract.mjs';

const path = 'public/evidence/model-proposals.json';
const record = JSON.parse(await readFile(path, 'utf8'));
const policy = record.sources.find((source) => source.id === 'policy-v1');
record.cases = record.cases.map((entry) => ({ ...entry, policyCheck: checkPolicy(entry.proposal, policy) }));
record.policyCheck = {
  command: 'node scripts/check-model-record.mjs',
  checkedAt: new Date().toISOString(),
  sourceRevision: `sha256:${createHash('sha256').update(await readFile('scripts/model-contract.mjs')).digest('hex')}`,
  passed: record.cases.filter((entry) => entry.policyCheck.passed).length,
  total: record.cases.length,
  boundary: 'Post-run deterministic check of retained outputs, not another inference. Both prompts concern printer maintenance. Original raw responses and inference provenance are retained.',
};
await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record.policyCheck));
