import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';

process.env.SEED_DEMO_DATA = 'false';
process.env.SEED_DEPARTMENTS = 'false';
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

test('admin CRUD returns compact committed state and preserves uploaded images',async()=>{
 app=await startServer({dataDir:directory,port:0,verifyToken,database});
 try {
 base='http://127.0.0.1:'+app.server.address().port+'/api/v1';
 const admin=client();
 await admin('/auth/setup','POST',{password:'integration-test-password'});
 const initial=(await admin('/admin/state')).data;
 const image='data:image/png;base64,'+Buffer.alloc(150000,1).toString('base64');
 const item={id:'review-test-rayon',name:'Rayon test',description:'Description',detail:'',value:1,status:'ACTIVE',image};
 const write=(revision,value)=>admin('/admin/state','PATCH',{revision,changes:[{kind:'departments',id:item.id,value}]});
 const added=await write(initial.revision,item);
 assert.equal(added.status,200,JSON.stringify(added.data));
 assert.equal(added.data.revision,initial.revision+1);
 assert.ok(JSON.stringify(added.data).length<10000);
 const saved=added.data.state.catalog.departments.find(x=>x.id===item.id);
 assert.match(saved.image,/^\/api\/v1\/media\/departments\//);
 const updated=await write(added.data.revision,{...saved,name:'Rayon modifié'});
 assert.equal(updated.status,200,JSON.stringify(updated.data));
 assert.equal(updated.data.state.catalog.departments.find(x=>x.id===item.id).image,saved.image);
 const media=await fetch(base.replace('/api/v1','')+saved.image);
 assert.equal(media.status,200);
 assert.equal((await media.arrayBuffer()).byteLength,150000);
 assert.equal((await write(added.data.revision,null)).status,409);
 const removed=await write(updated.data.revision,null);
 assert.equal(removed.status,200);
 assert.equal(removed.data.state.catalog.departments.some(x=>x.id===item.id),false);
 assert.equal((await fetch(base.replace('/api/v1','')+saved.image)).status,404);
 const final=(await admin('/admin/state')).data;
 assert.equal(final.revision,removed.data.revision);
 } finally {await app.close();await dropDatabase({database});await rm(directory,{recursive:true,force:true})}
});
