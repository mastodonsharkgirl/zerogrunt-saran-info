import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { RelayStore } from '../../lab/store.mjs';

test('ERP identity persists per database and wrong store blocks admission', async () => {
  const dir=mkdtempSync(join(tmpdir(),'invoice-erp-')); const env={...process.env,INVOICE_LAB_TOKEN:'test-session-token'}; const processes=[];
  const start = async (path) => {
    const socket=createServer(); await new Promise((resolve) => socket.listen(0,'127.0.0.1',resolve)); const port=socket.address().port; await new Promise((resolve) => socket.close(resolve));
    const child=spawn('python',['lab/erp.py',path,String(port)],{env,stdio:'ignore'}); processes.push(child);
    for(let attempt=0;attempt<50;attempt++) { try { const response=await fetch(`http://127.0.0.1:${port}/health`,{headers:{Authorization:'Bearer test-session-token'}}); return {child,port,id:(await response.json()).storeId}; } catch { await new Promise((resolve) => setTimeout(resolve,100)); } }
    throw Error('ERP did not start');
  };
  try {
    const firstPath=join(dir,'first.db'); const first=await start(firstPath); const second=await start(join(dir,'second.db')); assert.notEqual(first.id,second.id);
    const relayPath=join(dir,'relay.db'); const store=new RelayStore(relayPath,true); store.init({entity:'N',vendor:'V',invoiceId:'1',amountMinor:1,currency:'INR',purpose:'service',coding:'OFFICE-OPS'},first.id); store.approve('operator',Date.now()+10000); store.close();
    const result=spawnSync(process.execPath,['lab/relay.mjs','post',relayPath,String(second.port)],{encoding:'utf8',env}); assert.notEqual(result.status,0); const resumed=new RelayStore(relayPath); assert.equal(resumed.snapshot().state,'held'); assert.equal(resumed.snapshot().posts,0); resumed.close();
    first.child.kill(); await new Promise((resolve) => first.child.once('exit',resolve)); const restarted=await start(firstPath); assert.equal(restarted.id,first.id);
  } finally { for(const child of processes) if(child.exitCode===null && child.signalCode===null) { child.kill(); await new Promise((resolve) => child.once('exit',resolve)); } rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}); }
});
