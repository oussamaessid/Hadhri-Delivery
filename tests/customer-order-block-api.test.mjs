import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';

process.env.SEED_DEMO_DATA = 'true';
const directory = await mkdtemp(join(tmpdir(), 'hadhri-test-stream-'));
const database = basename(directory).replace(/[^a-zA-Z0-9_]/g,'_');
let app, base;
const claims = (uid, email = 'suivi@example.test') => ({uid, email, email_verified: true, name: 'Client Suivi', exp: Math.floor(Date.now() / 1000) + 3600, firebase: {sign_in_provider: 'password'}});
async function verifyToken(token) {
  if(token==='other')return claims('firebase-other','other@example.test');
  if (token === 'valid-suivi') return claims('firebase-suivi');
  throw Object.assign(new Error('Invalid token'), {status: 401});
}

function client() {
  const jar = {};
  const call = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, {method, headers: {cookie: Object.entries(jar).map(([k, v]) => k + '=' + v).join('; '), 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
    for (const raw of r.headers.getSetCookie()) { const [k, v] = raw.split(';')[0].split('='); jar[k] = v; }
    return {status: r.status, data: await r.json()};
  };
  call.jar = jar;
  return call;
}

test('order block permits login and history but denies checkout until admin unblocks',async()=>{
 app=await startServer({dataDir:directory,port:0,verifyToken,database});
 try{
 base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
 const admin=client(),customer=client();
 assert.equal((await admin('/auth/setup','POST',{password:'integration-test-password'})).status,200);
 const login=await customer('/customer/firebase-session','POST',{idToken:'valid-suivi',phone:'20000111'});
 assert.equal(login.status,200);
 const id=login.data.customer.id;
 const s=(await admin('/admin/state')).data.state;
 const product=s.catalog.products.find(p=>p.status==='ACTIVE'&&p.stock>=5&&s.catalog.restaurants.some(m=>m.id===p.merchantId&&m.status==='ACTIVE'));
 const order=()=>customer('/orders','POST',{requestId:randomUUID(),lines:[{productId:product.id,quantity:1}],customer:{name:'Client test',phone:'20000111',address:'12 avenue Habib Bourguiba, Monastir',notes:''}});
 assert.equal((await order()).status,201);
 const setBlock=async ordersBlocked=>{
  const snap=(await admin('/admin/state')).data;
  const value={...snap.state.catalog.customers.find(c=>c.id===id),ordersBlocked};
  const result=await admin('/admin/state','PATCH',{revision:snap.revision,changes:[{kind:'customers',id,value}]});
  assert.equal(result.status,200,JSON.stringify(result.data));
 };
 await setBlock(true);
 assert.equal((await order()).status,403);
 assert.equal((await customer('/state')).data.state.orders.length,1);
 await customer('/customer/logout','POST');
 assert.equal((await customer('/customer/firebase-session','POST',{idToken:'valid-suivi'})).status,200);
 assert.equal((await customer('/customer/me')).data.customer.id,id);
 assert.equal((await order()).status,403);
 assert.equal((await customer('/customer/profile','PATCH',{name:'Client test',phone:'20000111',ordersBlocked:false})).status,200);
 // An untrusted profile field must never clear the admin setting.
 assert.equal((await order()).status,403);
 await app.close();app=await startServer({dataDir:directory,port:0,verifyToken,database});base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
 assert.equal((await order()).status,403);
 await setBlock(false);
 assert.equal((await order()).status,201);
 assert.equal((await customer('/state')).data.state.orders.length,2);
 }finally{await app.close();await dropDatabase({database});await rm(directory,{recursive:true,force:true})}
});
