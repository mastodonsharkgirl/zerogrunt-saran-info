import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import net from 'node:net';
import { RelayStore } from './store.mjs';
import { identify } from './core.mjs';

const dir = mkdtempSync(join(tmpdir(), 'invoice-lab-'));
const relayPath = join(dir, 'relay.db'); const erpPath = join(dir, 'erp.db');
const invoice = { entity:'NORTHSTAR-IN', vendor:'PAPERCARE-01', invoiceId:'000184', amountMinor:125000, currency:'INR', purpose:'printer-maintenance', coding:'FACILITIES' };
const socket = net.createServer(); await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve)); const port = socket.address().port; await new Promise((resolve) => socket.close(resolve));
const token = randomBytes(32).toString('hex');
const env = {...process.env, INVOICE_LAB_TOKEN:token};
const headers = {Authorization:`Bearer ${token}`};
const erp = spawn('python', ['lab/erp.py', erpPath, String(port)], {stdio:'ignore', env});
const startedAt = new Date().toISOString();
try {
  let health; for (let attempt=0; attempt<50; attempt++) { try { health = await (await fetch(`http://127.0.0.1:${port}/health`, {headers})).json(); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); } }
  if (!health) throw Error('ERP did not start');
  const store = new RelayStore(relayPath, true); store.init(invoice, health.storeId); store.close();
  const invoke = (operation) => { const result = spawnSync(process.execPath, ['lab/relay.mjs', operation, relayPath, String(port)], {encoding:'utf8', env}); if (result.status !== 0) throw Error(result.stderr); return JSON.parse(result.stdout.trim()); };
  const before = await (await fetch(`http://127.0.0.1:${port}/count`, {headers})).json();
  const unapproved = spawnSync(process.execPath, ['lab/relay.mjs','post',relayPath,String(port)], {encoding:'utf8',env});
  const afterUnapproved = await (await fetch(`http://127.0.0.1:${port}/count`, {headers})).json();
  if (unapproved.status === 0 || !unapproved.stderr.includes('Admission blocked') || before.count !== afterUnapproved.count) throw Error('Unapproved attempt was not blocked');
  const approvalStore = new RelayStore(relayPath); approvalStore.approve('controller', Date.now()+60000); approvalStore.close();
  const interrupted = invoke('post'); const recovered = invoke('recover');
  const replay = await fetch(`http://127.0.0.1:${port}/invoices`, {method:'POST',headers:{...headers,'Content-Type':'application/json','Idempotency-Key':identify(invoice).key},body:JSON.stringify(invoice)});
  const replayReceipt = await replay.json();
  const conflict = await fetch(`http://127.0.0.1:${port}/invoices`, {method:'POST',headers:{...headers,'Content-Type':'application/json','Idempotency-Key':identify(invoice).key},body:JSON.stringify({...invoice, amountMinor:125001})});
  const count = await (await fetch(`http://127.0.0.1:${port}/count`, {headers})).json();
  if (interrupted.state !== 'outcome_unknown' || recovered.state !== 'verified' || count.count !== 1 || recovered.posts !== 1 || replay.status !== 200 || replayReceipt.receiptId !== recovered.receipt.receiptId || conflict.status !== 409) throw Error('Scenario verification failed');
  const transientPath = join(dir, 'transient-relay.db'); const transientInvoice = {...invoice,invoiceId:'000185'};
  const transientStore = new RelayStore(transientPath, true); transientStore.init(transientInvoice, health.storeId); transientStore.approve('controller', Date.now()+60000); transientStore.close();
  const transientInvoke = (operation) => { const result = spawnSync(process.execPath, ['lab/relay.mjs', operation, transientPath, String(port)], {encoding:'utf8',env}); if (result.status !== 0) throw Error(result.stderr); return JSON.parse(result.stdout.trim()); };
  const transientFirst = transientInvoke('transient'); const scheduled = transientInvoke('recover');
  if (transientFirst.state !== 'outcome_unknown' || scheduled.state !== 'retry_waiting' || !scheduled.nextDue) throw Error('Transient retry was not scheduled');
  const early = spawnSync(process.execPath, ['lab/relay.mjs','transient',transientPath,String(port)], {encoding:'utf8',env});
  if (early.status === 0 || !early.stderr.includes('Admission blocked')) throw Error('Retry ignored its due time');
  await new Promise((resolve) => setTimeout(resolve, Math.max(0,scheduled.nextDue-Date.now())));
  const transientSecond = transientInvoke('transient'); const transientRecovered = transientInvoke('recover');
  const afterTransient = await (await fetch(`http://127.0.0.1:${port}/count`, {headers})).json();
  if (transientSecond.posts !== 2 || transientRecovered.state !== 'verified' || transientRecovered.receipt.receiptId === recovered.receipt.receiptId || afterTransient.count !== count.count+1) throw Error('Transient retry verification failed');
  const sourceRevision = createHash('sha256'); for (const name of ['core.mjs','evaluation-engine.mjs','store.mjs','relay.mjs','erp.py','record.mjs']) sourceRevision.update(readFileSync(new URL(name, import.meta.url)));
  const report = { schemaVersion:1, scenario:'ERP commits; response is lost; relay restarts and reads receipt', command:'node lab/record.mjs', startedAt, completedAt:new Date().toISOString(), sourceRevision:`working-tree-sha256:${sourceRevision.digest('hex')}`, fixtureId:'invoice-000184', state:recovered.state, postingCount:count.count, receipt:recovered.receipt, metrics:{selectedFaultRecovery:{numerator:Number(recovered.state === 'verified'),denominator:1},duplicatePostings:{numerator:Math.max(0,count.count-1),denominator:1},unapprovedWrites:{numerator:afterUnapproved.count-before.count,denominator:1}}, events:[{step:'unapproved admission rejected', status:unapproved.status, erpCountBefore:before.count, erpCountAfter:afterUnapproved.count},{step:'post response lost', ...interrupted}, {step:'new relay process reads saved receipt', state:recovered.state, posts:recovered.posts, reads:recovered.reads}, {step:'identical duplicate submitted', status:replay.status}, {step:'same identity, changed amount', status:conflict.status}], transientScenario:{fixtureId:'invoice-000185',first:transientFirst,scheduled,earlyRetryBlocked:early.status !== 0,second:transientSecond,recovered:transientRecovered,postingCount:afterTransient.count-count.count}, boundary:'Two synthetic invoices share a local mock ERP store; each relay uses a separate SQLite store. No universal exactly-once guarantee.' };
  mkdirSync('public/evidence', {recursive:true}); writeFileSync('public/evidence/http-run.json', JSON.stringify(report, null, 2)+'\n'); console.log(JSON.stringify({state:report.state, postingCount:report.postingCount}));
} finally { erp.kill(); await new Promise((resolve) => erp.once('exit', resolve)); rmSync(dir, {recursive:true, force:true, maxRetries:10, retryDelay:100}); }
