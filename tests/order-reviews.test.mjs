import test from 'node:test';
import assert from 'node:assert/strict';
import {addOrderReview} from '../backend/order-reviews.mjs';
const state=(status='DELIVERED')=>({orders:[{id:'order-1',customerAccountId:'alice',status}]});
test('only the customer owning a delivered order can review it',()=>{
 for(const [customer,code] of [[null,401],['bob',404]])assert.throws(()=>addOrderReview(state(),'order-1',customer,{rating:5}),e=>e.status===code);
 for(const status of ['PENDING','CONFIRMED','ON_THE_WAY','CANCELLED'])assert.throws(()=>addOrderReview(state(status),'order-1','alice',{rating:5}),e=>e.status===409);
});
test('rating and comment are validated and an existing review cannot be overwritten',()=>{
 for(const rating of [0,6,2.5,'5',null])assert.throws(()=>addOrderReview(state(),'order-1','alice',{rating}));
 assert.throws(()=>addOrderReview(state(),'order-1','alice',{rating:5,comment:'a'.repeat(1001)}));
 assert.throws(()=>addOrderReview(state(),'order-1','alice',{rating:5,customerId:'bob'}));
 const s=state(),review=addOrderReview(s,'order-1','alice',{rating:4,comment:'  Livraison agréable  '});
 assert.equal(review.comment,'Livraison agréable');assert.equal(s.orders[0].review,review);assert.ok(Date.parse(review.createdAt));
 assert.throws(()=>addOrderReview(s,'order-1','alice',{rating:1}),e=>e.status===409);assert.equal(s.orders[0].review.rating,4);
});
