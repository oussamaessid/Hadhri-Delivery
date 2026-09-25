import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForService} from '../lib/wait-for-service.ts';
test('startup ignores the hosting HTML page until API readiness',async t=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async (_url,options)=>{assert.equal(options.cache,'no-store');requests++;return requests===1?new Response('<html>Render loading</html>',{headers:{'content-type':'text/html'}}):Response.json({status:'ok'})});
 await waitForService(new AbortController().signal,{intervalMs:1,timeoutMs:100});
 assert.equal(requests,2);
});
test('startup has a bounded failure and stops after cancellation',async t=>{
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('offline')});
 await assert.rejects(waitForService(new AbortController().signal,{intervalMs:1,timeoutMs:10}),/réessayer/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(waitForService(controller.signal));
});
