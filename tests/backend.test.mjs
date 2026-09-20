import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../backend/server.mjs';
import {dropDatabase} from '../backend/database.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
process.env.SEED_DEMO_DATA='true';
const directory=await mkdtemp(join(tmpdir(),'hadhri-test-'));
const database=basename(directory).replace(/[^a-zA-Z0-9_]/g,'_');
let app,base;
const claims=(uid,email='client@example.test',verified=true,provider='password')=>({uid,email,email_verified:verified,name:'Client Test',exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:provider}});
async function verifyToken(token){
 if(token==='legacy')return claims('firebase-legacy','legacy@example.test');
 if(token==='valid-client')return claims('firebase-client');
 if(token==='unverified')return claims('firebase-unverified','pending@example.test',false);
 if(token==='google-client')return claims('firebase-google','google@example.test',true,'google.com');
 if(token==='facebook-client')return claims('firebase-facebook','facebook@example.test',true,'facebook.com');
 if(token==='conflict')return claims('firebase-other');
 if(token==='expired')return {...claims('expired'),exp:1};
 if(token==='anonymous')return claims('anonymous','anonymous@example.test',true,'anonymous');
 throw Object.assign(new Error('Invalid token'),{status:401});
}
async function start(){app=await startServer({dataDir:directory,port:0,verifyToken,database});base='http://127.0.0.1:'+app.server.address().port+'/api/v1'}
async function stop(){if(app){await app.close();app=undefined}}
function client(){const jar={};return async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; '),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});for(const raw of r.headers.getSetCookie()){const [k,v]=raw.split(';')[0].split('=');jar[k]=v}return {status:r.status,data:await r.json()}}}
test('persistent API: auth, merchant relations, variants, concurrent stock, isolation, restart',async()=>{try{await start();const admin=client(),guest=client(),other=client();assert.equal((await guest('/admin/state')).status,401);assert.equal((await guest('/state')).status,200);assert.equal((await guest('/orders','POST',{})).status,401);assert.equal((await guest('/customer/register','POST',{})).status,410);
assert.equal((await guest('/customer/login','POST',{})).status,410);
assert.equal((await guest('/customer/firebase-session','POST',{idToken:'invalid'})).status,401);
assert.equal((await guest('/customer/firebase-session','POST',{idToken:'unverified'})).status,403);
assert.equal((await app.db.query('SELECT count(*) n FROM customer_accounts')).rows[0].n,0);
assert.equal((await guest('/orders','POST',{})).status,401);
assert.equal((await guest('/customer/firebase-session','POST',{idToken:'expired'})).status,401);
assert.equal((await guest('/customer/firebase-session','POST',{idToken:'anonymous'})).status,403);
await app.db.query("INSERT INTO customer_accounts(id,email,name,phone,password_hash,salt) VALUES('legacy-client','legacy@example.test','Legacy Client','20000999','old-password','old-salt')");
await app.db.query('INSERT INTO customers(id,data) VALUES($1,$2)',['legacy-client',JSON.stringify({id:'legacy-client',name:'Legacy Client',phone:'20000999',status:'ACTIVE',detail:'Monastir',value:0})]);
await app.db.query("INSERT INTO sessions(token,role,customer_id,expires_at) VALUES($1,'customer','legacy-client',NOW()+INTERVAL 7 DAY)",[createHash('sha256').update('legacy-session').digest('hex')]);
const legacy=client();assert.equal((await legacy('/customer/firebase-session','POST',{idToken:'legacy'})).data.customer.id,'legacy-client');
assert.equal((await app.db.query("SELECT password_hash FROM customer_accounts WHERE id='legacy-client'")).rows[0].password_hash,null);
assert.equal((await (await fetch(base+'/customer/me',{headers:{cookie:'hadhri_customer=legacy-session'}})).json()).customer,null);
assert.equal((await guest('/customer/firebase-session','POST',{idToken:'valid-client',phone:'20000111'})).status,200);
assert.equal((await other('/customer/firebase-session','POST',{idToken:'conflict'})).status,409);
assert.equal((await other('/customer/firebase-session','POST',{idToken:'google-client'})).status,200);
assert.equal((await other('/customer/me')).data.customer.email,'google@example.test');
assert.equal((await other('/customer/firebase-session','POST',{idToken:'facebook-client'})).status,200);
assert.equal((await other('/customer/me')).data.customer.email,'facebook@example.test');
assert.equal((await admin('/auth/setup','POST',{password:'integration-test-password'})).status,200);let snapshot=(await admin('/admin/state')).data;
assert.deepEqual(snapshot.state.catalog.departments.sort((a,b)=>a.value-b.value).map(d=>d.id),['restaurants','drinks','fish','produce','chicken','nuts']);
assert.ok(snapshot.state.catalog.departments.every(d=>d.image?.startsWith('/images/departments/')));
const restaurantDepartment=snapshot.state.catalog.departments.find(d=>d.id==='restaurants');
assert.equal((await admin('/admin/state','PATCH',{revision:snapshot.revision,changes:[{kind:'departments',id:'restaurants',value:{...restaurantDepartment,image:'/images/pizza.jpg'}}]})).status,200);
assert.equal((await guest('/departments/restaurants')).data.image,'/images/pizza.jpg');
snapshot=(await admin('/admin/state')).data;
const product=snapshot.state.catalog.products.find(p=>p.variants?.some(v=>v.id==='large'));const updated={...product,stock:1};assert.equal((await admin('/admin/state','PATCH',{revision:snapshot.revision,changes:[{kind:'products',id:product.id,value:updated}]})).status,200);assert.equal((await admin('/admin/state','PATCH',{revision:snapshot.revision,changes:[]})).status,409);const order={requestId:randomUUID(),lines:[{productId:product.id,quantity:1,variantId:'large'}],customer:{name:'Client Test',phone:'20000111',address:'12 rue Test, Tunis',notes:''}};const invalid=await guest('/orders','POST',{...order,lines:[{productId:product.id,quantity:1,variantId:'invented'}]});assert.equal(invalid.status,400);const results=await Promise.all([guest('/orders','POST',order),guest('/orders','POST',{...order,requestId:randomUUID()})]);assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);const created=results.find(r=>r.status===201).data[0];assert.equal(created.total,product.value+5+4);const replay=await guest('/orders','POST',order);assert.equal(replay.data[0].id,created.id);assert.equal((await other('/state')).data.state.orders.length,0);await guest('/customer/logout','POST');assert.equal((await guest('/orders','POST',order)).status,401);assert.equal((await guest('/state')).data.state.orders.length,0);assert.equal((await guest('/customer/firebase-session','POST',{idToken:'valid-client'})).status,200);assert.ok((await guest('/state')).data.state.orders.some(o=>o.id===created.id));snapshot=(await admin('/admin/state')).data;assert.equal(snapshot.state.catalog.products.find(p=>p.id===product.id).stock,0);assert.equal((await guest('/restaurants/R1')).data.products.every(p=>p.merchantId==='R1'),true);await stop();await start();const persisted=(await admin('/admin/state')).data;assert.equal(persisted.state.catalog.departments.find(d=>d.id==='restaurants').image,'/images/pizza.jpg');assert.ok(persisted.state.orders.some(o=>o.id===created.id));assert.equal(persisted.state.catalog.products.find(p=>p.id===product.id).stock,0);const merchant={id:'TEST-REST',name:'Restaurant Test',status:'ACTIVE',detail:'Tunis',value:4.5};const category={id:'TEST-CAT',name:'Snacks',status:'ACTIVE',detail:merchant.name,value:1,merchantId:merchant.id};const item={...product,id:'TEST-PRODUCT',name:'Biscuit test',merchantId:merchant.id,categoryId:category.id,stock:8};assert.equal((await admin('/admin/state','PATCH',{revision:persisted.revision,changes:[{kind:'restaurants',id:merchant.id,value:merchant},{kind:'categories',id:category.id,value:category},{kind:'products',id:item.id,value:item}]})).status,200);const detail=(await guest('/restaurants/TEST-REST')).data;assert.equal(detail.products[0].merchant,merchant.name);assert.equal(detail.categories[0].id,category.id);let next=(await admin('/admin/state')).data;assert.equal((await admin('/admin/state','PATCH',{revision:next.revision,changes:[{kind:'restaurants',id:merchant.id,value:null}]})).status,400);for(const status of ['CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','CANCELLED']){next=(await admin('/admin/state')).data;const row=next.state.orders.find(o=>o.id===created.id);const driver=status==='DRIVER_ASSIGNED'?next.state.catalog.drivers.find(d=>d.status==='AVAILABLE'):null;const changes=[{kind:'orders',id:row.id,value:{...row,status,driver:driver?.name||row.driver}}];if(driver)changes.unshift({kind:'drivers',id:driver.id,value:{...driver,status:'BUSY'}});assert.equal((await admin('/admin/state','PATCH',{revision:next.revision,changes})).status,200)}assert.equal((await admin('/admin/state')).data.state.catalog.products.find(p=>p.id===product.id).stock,1)}finally{await stop();await dropDatabase({database});await rm(directory,{recursive:true,force:true})}});
