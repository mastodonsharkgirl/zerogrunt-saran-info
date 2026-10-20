import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RelayStore } from '../../lab/store.mjs';

test('stored correction is tested, activated, scoped and withdrawn across restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'invoice-rule-')); const path = join(directory, 'relay.db'); let store;
  const invoice = {entity:'NORTHSTAR-IN',vendor:'PAPERCARE-01',invoiceId:'000184',amountMinor:125000,currency:'INR',purpose:'printer-maintenance',coding:'OFFICE-OPS'};
  try {
    store = new RelayStore(path, true); store.init(invoice, 'store'); store.approve('controller', Date.now()+10000);
    const event = store.proposeCorrection('FACILITIES', 'operator', 'Printer service coding', true);
    assert.equal(JSON.parse(store.snapshot().invoice).coding,'FACILITIES');
    assert.equal(store.admit(),null);
    store.advanceRule(event.candidate.version, 'approveTesting', 'controller', {policyRevision:1});
    const evaluated = store.advanceRule(event.candidate.version, 'evaluate', 'reviewer', {policyRevision:1});
    assert.ok(evaluated.evaluationId);
    assert.throws(() => store.advanceRule(event.candidate.version, 'activate', 'controller', {policyRevision:1,evaluationId:'wrong'}));
    store.advanceRule(event.candidate.version, 'activate', 'controller', {policyRevision:1,evaluationId:evaluated.evaluationId});
    assert.equal(store.admit(), null);
    store.close(); store = new RelayStore(path);
    assert.equal(store.routeFuture({...invoice,invoiceId:'000185'}).coding,'FACILITIES');
    assert.equal(store.routeFuture({...invoice,invoiceId:'000186',purpose:'supplies'}).coding,'OFFICE-OPS');
    store.advanceRule(event.candidate.version, 'withdraw', 'controller');
    assert.equal(store.routeFuture({...invoice,invoiceId:'000185'}).coding,'OFFICE-OPS');
  } finally { store?.close(); rmSync(directory, {recursive:true,force:true,maxRetries:10,retryDelay:100}); }
});
