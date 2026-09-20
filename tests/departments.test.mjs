import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {connectDatabase,dropDatabase} from '../backend/database.mjs';
import {initialState} from '../features/admin/data/demo.ts';
import {migrateStorage,snapshot,saveSnapshot} from '../backend/storage.mjs';
import {seedShopping} from '../backend/seed-shopping.mjs';
test('home departments replace the old list once, preserve products and retain edited images',async()=>{
 const database='hadhri_test_departments_'+randomUUID().replace(/-/g,'');
 const db=await connectDatabase({database});
 try{
  await db.query('INSERT INTO app_state(id,data) VALUES(1,$1)',[JSON.stringify(initialState())]);
  await migrateStorage(db);
  const before=(await snapshot(db)).data;
  before.catalog.departments=[{id:'cleaning',name:'Nettoyage',detail:'Nettoyage',status:'ACTIVE',value:0}];
  before.catalog.categories[0].department='cleaning';
  await db.transaction(tx=>saveSnapshot(tx,before));
  await seedShopping(db);
  const after=(await snapshot(db)).data;
  assert.deepEqual(after.catalog.products,before.catalog.products);
  assert.deepEqual(after.orders,before.orders);
  assert.equal(after.catalog.departments.length,6);
  assert.ok(after.catalog.departments.some(d=>d.id==='restaurants'));
  assert.ok(!after.catalog.categories.some(c=>c.department==='cleaning'));
  assert.ok(after.catalog.categories.filter(c=>c.name==='Boissons').every(c=>c.department==='drinks'));
  for(const department of after.catalog.departments){const photo=await readFile(new URL('../public'+department.image,import.meta.url));assert.equal(photo[0],0xff);assert.equal(photo[1],0xd8)}
  after.catalog.departments[0].image='/images/pizza.jpg';
  await db.transaction(tx=>saveSnapshot(tx,after));
  await seedShopping(db);
  assert.equal((await snapshot(db)).data.catalog.departments[0].image,'/images/pizza.jpg');
 }finally{await db.close();await dropDatabase({database})}
});
