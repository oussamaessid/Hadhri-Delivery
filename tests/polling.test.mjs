import test from 'node:test';
import assert from 'node:assert/strict';
import {startPolling} from '../lib/polling.ts';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('polling prevents overlap, pauses when hidden, resumes and cleans up',async t=>{
 const doc=Object.assign(new EventTarget(),{hidden:false});const win=new EventTarget();
 const previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document=doc;globalThis.window=win;
 t.after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow});
 let calls=0,resolve,signal;
 const stop=startPolling(s=>{calls++;signal=s;return new Promise(r=>{resolve=r})},100000);
 try{
  assert.equal(calls,1);win.dispatchEvent(new Event('focus'));assert.equal(calls,1);
  resolve();await flush();doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,1);
  doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls,2);
  stop();assert.equal(signal.aborted,true);resolve();await flush();
  win.dispatchEvent(new Event('focus'));assert.equal(calls,2);
 }finally{stop()}
});
