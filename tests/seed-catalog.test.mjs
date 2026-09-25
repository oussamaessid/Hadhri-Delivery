import test from 'node:test';
import assert from 'node:assert/strict';
import {addExampleCatalog} from '../backend/seed-catalog.mjs';
const empty = () => ({catalog:{restaurants:[],categories:[],products:[],departments:['restaurants','drinks','fish','produce','chicken','nuts'].map(id=>({id}))}});
test('example catalogue covers every rayon and distinct restaurant menus',()=>{
 const data=empty();const counts=addExampleCatalog(data);
 assert.equal(counts.products,52);
 for(const department of ['drinks','fish','produce','chicken','nuts']) {
  const categories=data.catalog.categories.filter(c=>c.department===department);
  assert.ok(categories.length);
  assert.ok(data.catalog.products.some(p=>categories.some(c=>c.id===p.categoryId)));
 }
 for(const merchant of data.catalog.restaurants.filter(m=>m.id.startsWith('restaurant-'))) {
  const categories=data.catalog.categories.filter(c=>c.merchantId===merchant.id);
  assert.ok(categories.length>=2);
  assert.ok(categories.every(c=>!c.department));
 }
 for(const product of data.catalog.products) {
  assert.ok(data.catalog.categories.some(c=>c.id===product.categoryId&&c.merchantId===product.merchantId));
  assert.ok(product.value>0&&product.stock>0);
 }
});
test('seeding preserves edited records and reuses existing restaurant IDs',()=>{
 const data=empty();data.catalog.restaurants.push({id:'existing-pizza',name:"O'Pizza",detail:'Adresse conservée'});
 data.catalog.categories.push({id:'existing-pizzas',merchantId:'existing-pizza',name:'Pizzas'});
 addExampleCatalog(data);
 assert.equal(data.catalog.categories.filter(c=>c.merchantId==='existing-pizza'&&c.name==='Pizzas').length,1);
 assert.equal(data.catalog.restaurants.filter(m=>m.name.includes('Pizza')).length,1);
 const product=data.catalog.products.find(p=>p.merchantId==='existing-pizza');product.value=99;
 const before=JSON.stringify(data);
 assert.deepEqual(addExampleCatalog(data),{restaurants:0,categories:0,products:0});
 assert.equal(JSON.stringify(data),before);
});
