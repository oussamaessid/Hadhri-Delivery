import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrderTracker} from '../lib/order-changes.ts';
test('HTTP snapshots baseline old orders, alert once for new IDs and detect status/driver changes',()=>{
 const track=createOrderTracker();
 const old={id:'old',status:'PENDING',driver:''};
 assert.deepEqual(track([old]),{added:[],changed:[]});
 const fresh={id:'new',status:'PENDING',driver:''};
 assert.deepEqual(track([fresh,old]),{added:[fresh],changed:[]});
 assert.deepEqual(track([old,fresh]),{added:[],changed:[]});
 const updated={...old,status:'CONFIRMED'};
 assert.deepEqual(track([updated,fresh]),{added:[],changed:[updated]});
 const assigned={...updated,driver:'Driver'};
 assert.deepEqual(track([assigned,fresh]),{added:[],changed:[assigned]});
 track([]);
 assert.equal(track([assigned,fresh]).added.length,0);
});
test('an initially empty catalogue still notifies the first order',()=>{
 const track=createOrderTracker();track([]);
 assert.equal(track([{id:'first'}]).added.length,1);
});
