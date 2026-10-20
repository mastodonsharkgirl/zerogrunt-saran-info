import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const candidate = await readFile('lab/candidate.json');
await mkdir('.private', { recursive: true });
const freeze = { frozenAt: new Date().toISOString(), candidateHash: createHash('sha256').update(candidate).digest('hex'), candidate: JSON.parse(candidate), purpose: 'Candidate frozen before separate QA agent authors additional challenge cases. No tuning after opening these cases. Original known replay retained separately.' };
await writeFile('.private/candidate-freeze.json', `${JSON.stringify(freeze, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ frozenAt: freeze.frozenAt, candidateHash: freeze.candidateHash }));
