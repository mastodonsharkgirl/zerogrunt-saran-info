import { RelayStore } from './store.mjs';
import { identify } from './core.mjs';
const [command, path, port] = process.argv.slice(2);
const store = new RelayStore(path);
const base = `http://127.0.0.1:${Number(port)}`;
const token = process.env.INVOICE_LAB_TOKEN;
if (!token || !Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) throw Error('Invalid local connection');
try {
  const health = await fetch(`${base}/health`, {headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(2000),redirect:'error'});
  const healthBody = await health.json();
  if (health.status !== 200 || !healthBody || Object.keys(healthBody).length !== 1 || typeof healthBody.storeId !== 'string') throw Error('ERP health unavailable');
  if (healthBody.storeId !== store.snapshot().store_id) { store.holdStoreMismatch(); throw Error('ERP store mismatch'); }
  if (command === 'post' || command === 'transient') {
    const attempt = store.admit();
    if (!attempt) throw Error('Admission blocked');
    let retryAllowed = true; let retryAfter = null;
    try { const response = await fetch(`${base}/invoices`, { method:'POST', headers:{'Authorization':`Bearer ${token}`, 'Content-Type':'application/json', 'Idempotency-Key':identify(attempt.invoice).key, 'X-Lab-Fault':command === 'post' ? 'lose-after-commit' : 'transient-once'}, body:JSON.stringify(attempt.invoice), signal:AbortSignal.timeout(2000), redirect:'error' }); retryAllowed = [408,429,502,503,504].includes(response.status); retryAfter = response.headers.get('Retry-After'); } catch {} finally { store.unknown(attempt.generation, retryAllowed, retryAfter); }
    console.log(JSON.stringify({ state:store.snapshot().state, posts:store.snapshot().posts }));
  } else if (command === 'recover') {
    const generation = store.reserveRead();
    if (generation === null) throw Error('Read blocked');
    const row = store.snapshot(); const invoice = JSON.parse(row.invoice); const key = identify(invoice).key;
    try { const response = await fetch(`${base}/invoices/${key}`, { headers:{'Authorization':`Bearer ${token}`,'X-Request-Id':generation.requestId}, signal:AbortSignal.timeout(2000), redirect:'error' }); if (response.status === 200) store.settleRead(generation, await response.json()); else if (response.status === 404) store.settleAbsent(generation, await response.json(), generation.requestId, Date.now(), response.headers.get('Retry-After')); } catch {}
    const result = store.snapshot(); console.log(JSON.stringify({ state:result.state, posts:result.posts, reads:result.reads, nextDue:result.next_due, receipt:result.receipt ? JSON.parse(result.receipt) : null }));
  } else throw Error('Unknown command');
} finally { store.close(); }
