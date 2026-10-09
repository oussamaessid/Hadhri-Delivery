import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';

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
 const image='data:image/png;base64,'+(await sharp({create:{width:720,height:720,channels:3,background:'#be6014'}}).png().toBuffer()).toString('base64');
 const item={id:'review-test-rayon',name:'Rayon test',description:'Description',detail:'',value:1,status:'ACTIVE',image};
 const write=(revision,value)=>admin('/admin/state','PATCH',{revision,changes:[{kind:'departments',id:item.id,value}]});
 const added=await write(initial.revision,item);
 assert.equal(added.status,200,JSON.stringify(added.data));
 assert.equal(added.data.revision,initial.revision+1);
 assert.ok(JSON.stringify(added.data).length<10000);
 const saved=added.data.state.catalog.departments.find(x=>x.id===item.id);
 assert.match(saved.image,/^\/api\/v1\/uploads\//);
 const updated=await write(added.data.revision,{...saved,name:'Rayon modifié'});
 assert.equal(updated.status,200,JSON.stringify(updated.data));
 assert.equal(updated.data.state.catalog.departments.find(x=>x.id===item.id).image,saved.image);
 const media=await fetch(base.replace('/api/v1','')+saved.image);
 assert.equal(media.status,200);
 assert.equal(media.headers.get('content-type'),'image/webp');
 assert.ok((await media.arrayBuffer()).byteLength>0);
 const stored=(await app.db.query('SELECT data FROM departments WHERE id=$1',[item.id])).rows[0].data;
 assert.equal(stored.image,saved.image);
 assert.ok(!JSON.stringify(stored).includes('base64'));
 assert.equal((await write(added.data.revision,null)).status,409);
 const removed=await write(updated.data.revision,null);
 assert.equal(removed.status,200);
 assert.equal(removed.data.state.catalog.departments.some(x=>x.id===item.id),false);
 // Immutable files survive deletion so backups and cached clients remain valid.
 assert.equal((await fetch(base.replace('/api/v1','')+saved.image)).status,200);
 const final=(await admin('/admin/state')).data;
 assert.equal(final.revision,removed.data.revision);
 // Exercise a 600-product catalogue without inline images in an isolated database.
 let rev=final.revision;
 const patch=async changes=>{const response=await admin('/admin/state','PATCH',{revision:rev,changes});assert.equal(response.status,200,JSON.stringify(response.data));rev=response.data.revision;return response};
 await patch([{kind:'restaurants',id:'test-merchant',value:{id:'test-merchant',name:'Restaurant test',detail:'',value:0,status:'ACTIVE'}},{kind:'categories',id:'test-category',value:{id:'test-category',name:'Catégorie test',detail:'',value:0,status:'ACTIVE',merchantId:'test-merchant'}}]);
 const product=i=>({id:'test-product-'+i,name:'Produit '+i,detail:'',value:5,status:'ACTIVE',merchantId:'test-merchant',categoryId:'test-category',image:saved.image});
 for(let batch=0;batch<6;batch++)await patch(Array.from({length:100},(_,j)=>{const value=product(batch*100+j);return {kind:'products',id:value.id,value}}));
 const measured=async(label,fn)=>{const start=performance.now();const result=await fn();console.log(`[600 products] ${label}: ${Math.round(performance.now()-start)}ms`);return result};
 await measured('add',()=>patch([{kind:'products',id:'test-product-600',value:product(600)}]));
 await measured('edit',()=>patch([{kind:'products',id:'test-product-600',value:{...product(600),name:'Produit modifié'}}]));
 await measured('delete',()=>patch([{kind:'products',id:'test-product-600',value:null}]));
 const catalogue=await measured('public catalogue',()=>admin('/state'));
 assert.equal(catalogue.data.state.catalog.products.length,600);
 assert.ok(JSON.stringify(catalogue.data).length<400000);
 // Startup migrates old inline photos without losing rows and remains idempotent.
 await app.db.query('INSERT INTO departments (id,data) VALUES($1,$2)',['legacy-image',JSON.stringify({...item,id:'legacy-image'})]);
 await app.close();
 app=await startServer({dataDir:directory,port:0,verifyToken,database});
 const migrated=(await app.db.query('SELECT data FROM departments WHERE id=$1',['legacy-image'])).rows[0].data;
 assert.match(migrated.image,/^\/api\/v1\/uploads\//);
 const revision=(await app.db.query('SELECT revision FROM app_state WHERE id=1')).rows[0].revision;
 await app.close();
 app=await startServer({dataDir:directory,port:0,verifyToken,database});
 assert.equal((await app.db.query('SELECT revision FROM app_state WHERE id=1')).rows[0].revision,revision);

 } finally {await app.close();await dropDatabase({database});await rm(directory,{recursive:true,force:true})}
});
