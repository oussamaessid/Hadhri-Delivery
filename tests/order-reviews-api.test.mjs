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

test('reviews: ownership, delivered status, concurrent duplicates and persistence',async()=>{
 app=await startServer({dataDir:directory,port:0,verifyToken,database});
 try{
 base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
 const admin=client(),customer=client(),other=client(),guest=client();
 await admin('/auth/setup','POST',{password:'integration-test-password'});
 await customer('/customer/firebase-session','POST',{idToken:'valid-suivi',phone:'20000111'});
 await other('/customer/firebase-session','POST',{idToken:'other',phone:'20000112'});
 const s=(await admin('/admin/state')).data.state;
 const product=s.catalog.products.find(p=>p.status==='ACTIVE'&&p.stock>=5&&s.catalog.restaurants.some(m=>m.id===p.merchantId&&m.status==='ACTIVE'));
 const created=await customer('/orders','POST',{requestId:randomUUID(),lines:[{productId:product.id,quantity:1}],customer:{name:'Review Test',phone:'20000111',address:'12 avenue Habib Bourguiba, Monastir',notes:''}});
 assert.equal(created.status,201,JSON.stringify(created.data));
 const id=created.data[0].id,path='/orders/'+id+'/review';
 assert.equal((await guest(path,'POST',{rating:5})).status,401);
 assert.equal((await other(path,'POST',{rating:5})).status,404);
 assert.equal((await customer(path,'POST',{rating:5})).status,409);
 for(const status of ['CONFIRMED','ON_THE_WAY','DELIVERED']){
  const snap=(await admin('/admin/state')).data;
  const order=snap.state.orders.find(o=>o.id===id);
  assert.equal((await admin('/admin/state','PATCH',{revision:snap.revision,changes:[{kind:'orders',id,value:{...order,status}}]})).status,200);
 }
 assert.equal((await customer(path,'POST',{rating:6})).status,400);
 const results=await Promise.all([customer(path,'POST',{rating:5,comment:'Merci'}),customer(path,'POST',{rating:4})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 const stored=(await admin('/admin/state')).data.state.orders.find(o=>o.id===id).review;
 assert.ok(stored.createdAt);
 await app.close();app=await startServer({dataDir:directory,port:0,verifyToken,database});base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
 assert.deepEqual((await customer('/state')).data.state.orders.find(o=>o.id===id).review,stored);
 assert.equal((await other('/state')).data.state.orders.length,0);
 }finally{await app.close();await dropDatabase({database});await rm(directory,{recursive:true,force:true})}
});
