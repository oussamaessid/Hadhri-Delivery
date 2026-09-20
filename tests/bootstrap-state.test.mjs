import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapState} from '../backend/bootstrap-state.mjs';
test('production empty state never invokes demo generation',()=>{const state=bootstrapState(()=>{throw new Error('demo invoked')},false);assert.ok(Object.values(state.catalog).every(rows=>rows.length===0));assert.deepEqual(state.orders,[]);assert.deepEqual(state.notifications,[]);assert.equal(state.settings.name,'Hadhri Delivery');});
test('demo mode remains opt-in compatible',()=>{const demo={example:true};assert.equal(bootstrapState(()=>demo,true),demo);});
