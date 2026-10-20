import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RelayStore } from '../../lab/store.mjs';

test('approval is invalidated by context and attempt budget persists after restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-')); const path = join(dir, 'relay.db');
  try { const store = new RelayStore(path, true); store.init({ entity:'N', vendor:'V', invoiceId:'0001', amountMinor:1, currency:'INR', purpose:'service', coding:'OFFICE-OPS' }, 'store'); store.approve('operator', Date.now()+10000); store.changeContext(2); assert.equal(store.admit(), null); store.approve('operator', Date.now()+10000); const attempt = store.admit(); assert.equal(attempt.generation, 2); store.unknown(attempt.generation); store.close(); const resumed = new RelayStore(path); assert.equal(resumed.snapshot().posts, 1); assert.equal(resumed.admit(), null); assert.equal(resumed.settleRead(1, {}), false); assert.equal(resumed.snapshot().state, 'outcome_unknown'); resumed.close(); } finally { rmSync(dir, { recursive:true, force:true }); }
});

test('missing relay state fails closed', () => { assert.throws(() => new RelayStore(join(tmpdir(), 'nonexistent-invoice-state.db')), /missing/); });

test('expired approval cannot reserve a write', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-expiry-')); const path = join(dir, 'relay.db');
  try { const store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator', 1); assert.equal(store.admit(Date.now()), null); assert.equal(store.snapshot().posts, 0); store.close(); } finally { rmSync(dir, {recursive:true, force:true}); }
});

test('approval missing its expiry cannot reserve a write', () => {
  const dir=mkdtempSync(join(tmpdir(),'invoice-corrupt-')); const path=join(dir,'relay.db'); let store;
  try { store=new RelayStore(path,true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'},'store'); store.approve('operator',Date.now()+10000); const approval=JSON.parse(store.snapshot().approval); delete approval.expiresAt; store.db.prepare('UPDATE job SET approval=? WHERE id=1').run(JSON.stringify(approval)); assert.equal(store.admit(),null); assert.equal(store.snapshot().posts,0); } finally { store?.close(); rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}); }
});

test('threshold change invalidates finance approval and requires a manager', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-policy-')); const path = join(dir, 'relay.db'); let store;
  try { store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:500,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator', Date.now()+10000); store.changeContext(2, 100); assert.equal(store.admit(), null); assert.throws(() => store.approve('operator', Date.now()+10000)); store.approve('controller', Date.now()+10000); assert.ok(store.admit()); } finally { store?.close(); rmSync(dir, {recursive:true, force:true, maxRetries:10, retryDelay:100}); }
});

test('uncertain writes require correlated absence, respect retry wait, and retain budgets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-retry-')); const path = join(dir, 'relay.db');
  try {
    let store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store');
    const now = Date.now(); store.approve('operator', now+100000); const attempt = store.admit(now); store.unknown(attempt.generation); const read = store.reserveRead(now+1);
    assert.equal(store.settleAbsent(read, {schemaVersion:1,code:'not_found',requestId:'wrong',message:'Synthetic ERP request rejected.'}, 'read-1', now+1, '2'), false);
    assert.equal(store.admit(now+2), null);
    assert.equal(store.settleAbsent(read, {schemaVersion:1,code:'not_found',requestId:read.requestId,message:'Synthetic ERP request rejected.'}, read.requestId, now+1, '2'), true);
    assert.equal(store.admit(now+1999), null); store.close(); store = new RelayStore(path);
    assert.equal(store.admit(now+2001).generation, 2); assert.equal(store.snapshot().posts, 2); store.close();
  } finally { rmSync(dir, {recursive:true, force:true}); }
});

test('mismatched receipt is held and revocation cannot recall an admitted attempt', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-hold-')); const path = join(dir, 'relay.db'); let store;
  try { const now=Date.now(); store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator', now+100000); const attempt = store.admit(now); store.revoke(); store.unknown(attempt.generation); const generation = store.reserveRead(now+1); assert.equal(store.settleRead(generation, {storeId:'wrong'}), false); assert.equal(store.snapshot().state, 'held'); assert.equal(store.admit(now+2), null); } finally { store?.close(); rmSync(dir, {recursive:true, force:true, maxRetries:10, retryDelay:100}); }
});

test('nontransient outcome cannot retry even after correlated absence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-permanent-')); const path = join(dir, 'relay.db'); let store;
  try { const now=Date.now(); store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator', now+100000); const attempt = store.admit(now); store.unknown(attempt.generation, false); const generation = store.reserveRead(now+1); assert.equal(store.settleAbsent(generation, {schemaVersion:1,code:'not_found',requestId:'read',message:'Synthetic ERP request rejected.'}, 'read', now+1, null), false); assert.equal(store.admit(now+2), null); } finally { store?.close(); rmSync(dir, {recursive:true, force:true, maxRetries:10, retryDelay:100}); }
});

test('an older read callback cannot settle over a later reserved read', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-read-')); const path = join(dir, 'relay.db'); let store;
  try { const now=Date.now(); store = new RelayStore(path, true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator', now+100000); const attempt = store.admit(now); store.unknown(attempt.generation); const old = store.reserveRead(now+1); store.reserveRead(now+2); assert.equal(store.settleAbsent(old, {schemaVersion:1,code:'not_found',requestId:'old',message:'Synthetic ERP request rejected.'}, 'old', now+3, null), false); assert.equal(store.snapshot().state, 'outcome_unknown'); } finally { store?.close(); rmSync(dir, {recursive:true, force:true, maxRetries:10, retryDelay:100}); }
});

test('restart after admission can schedule retry only from correlated absence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-crash-')); const path = join(dir, 'relay.db'); let store;
  try { const now=Date.now(); store = new RelayStore(path,true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'}, 'store'); store.approve('operator',now+100000); store.admit(now); store.close(); store = new RelayStore(path); const read=store.reserveRead(now+1); assert.equal(store.settleAbsent(read,{schemaVersion:1,code:'not_found',requestId:read.requestId,message:'Synthetic ERP request rejected.'},read.requestId,now+1,null),true); assert.equal(store.snapshot().state,'retry_waiting'); } finally { store?.close(); rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}); }
});

test('corrupt retry deadlines or due times cannot reserve another write', () => {
  for (const field of ['deadline','next_due']) {
    const dir=mkdtempSync(join(tmpdir(),'invoice-corrupt-time-')); const path=join(dir,'relay.db'); let store;
    try { const now=Date.now(); store=new RelayStore(path,true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'},'store'); store.approve('operator',now+100000); const attempt=store.admit(now); store.unknown(attempt.generation); const read=store.reserveRead(now+1); store.settleAbsent(read,{schemaVersion:1,code:'not_found',requestId:read.requestId,message:'Synthetic ERP request rejected.'},read.requestId,now+1,'10'); store.db.prepare(`UPDATE job SET ${field}=? WHERE id=1`).run(field === 'deadline' ? null : 'corrupt'); assert.throws(() => store.admit(now+2),/corrupt/); assert.equal(store.db.prepare('SELECT posts FROM job').get().posts,1); } finally { store?.close(); rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}); }
  }
});

test('a proposal conflicting with mandatory coding cannot be approved', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invoice-required-')); const path = join(dir, 'relay.db'); let store;
  const invoice={entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'};
  const context={entity:'N',vendor:'V',thresholdMinor:100000,revision:1,effectiveAt:'2026-01-01T00:00:00Z',supersededAt:null,conflict:false,permittedCoding:['OFFICE-OPS','FACILITIES'],requiredCoding:'FACILITIES',source:'synthetic-policy-v1'};
  try { store=new RelayStore(path,true); store.init(invoice,'store',context); assert.throws(() => store.approve('operator',Date.now()+10000)); assert.equal(store.admit(),null); assert.equal(store.snapshot().posts,0); } finally { store?.close(); rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}); }
});
