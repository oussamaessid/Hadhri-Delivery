import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../features/admin/data/demo.ts';
import {createCustomerOrders,calculateCart} from '../features/customer/services/checkout.ts';
const input={requestId:'test-order-123',clientSessionId:'demo-user',lines:[{productId:'P6',quantity:2}],customer:{name:'Client Démo',phone:'20000111',address:'12 rue de la Paix, Tunis',notes:''}};
test('checkout recalculates total, keeps product data, notifies admin and creates customer',()=>{const s=initialState();const before=s.catalog.products.find(p=>p.id==='P6');const result=createCustomerOrders(s,input);assert.equal(result.orders.length,1);assert.equal(result.orders[0].total,Math.round((before.value*2+s.settings.fee)*100)/100);assert.equal(result.orders[0].status,'PENDING');assert.equal(result.state.catalog.products.find(p=>p.id==='P6').stock,before.stock);assert.equal(result.state.orders.length,s.orders.length+1);assert.equal(result.state.notifications.length,s.notifications.length+1);assert.equal(result.state.catalog.customers.length,s.catalog.customers.length+1);assert.equal(s.catalog.products.find(p=>p.id==='P6').stock,before.stock);});
test('repeated checkout is idempotent and cannot create the order twice',()=>{const first=createCustomerOrders(initialState(),input);const second=createCustomerOrders(first.state,input);assert.equal(second.orders[0].id,first.orders[0].id);assert.deepEqual(second.state,first.state);});
test('oversized, inactive and empty carts are rejected; mixed-merchant carts split into separate baskets',()=>{const s=initialState();assert.throws(()=>calculateCart(s,[{productId:'P1',quantity:1}]));assert.throws(()=>calculateCart(s,[{productId:'P6',quantity:999}]));assert.throws(()=>calculateCart(s,[]));assert.throws(()=>calculateCart(s,[{productId:'P6',quantity:-1}]));const mixed=calculateCart(s,[{productId:'P6',quantity:1},{productId:'P2',quantity:1}]);assert.equal(mixed.baskets.length,2);});
test('invalid address and phone do not create an order',()=>{const s=initialState();assert.throws(()=>createCustomerOrders(s,{...input,customer:{...input.customer,address:'x'}}));assert.throws(()=>createCustomerOrders(s,{...input,customer:{...input.customer,phone:'abc'}}));assert.equal(s.orders.length,240);});
test('multiple variants share the same product quantity limit and retain their prices',()=>{const state=initialState();const p=state.catalog.products.find(p=>p.variants?.some(v=>v.id==='large'));const lines=[{productId:p.id,variantId:'standard',quantity:1},{productId:p.id,variantId:'large',quantity:2}];const result=createCustomerOrders(state,{...input,lines});assert.equal(result.orders.length,1);assert.equal(result.orders[0].total,p.value*3+10+4);assert.equal(result.state.catalog.products.find(x=>x.id===p.id).stock,p.stock);assert.throws(()=>calculateCart(state,[{productId:p.id,variantId:'standard',quantity:50},{productId:p.id,variantId:'large',quantity:50}]),/Quantité trop élevée/)});
test('delivery fee is charged once for the first position and at the extra rate for each additional position',()=>{const s=initialState();const single=calculateCart(s,[{productId:'P6',quantity:1}]);assert.equal(single.fee,4);const mixed=calculateCart(s,[{productId:'P6',quantity:1},{productId:'P2',quantity:1}]);assert.deepEqual(mixed.baskets.map(b=>b.fee),[4,1]);assert.equal(mixed.fee,5);const custom=calculateCart({...s,settings:{...s.settings,fee:3.5,extraFee:1.5}},[{productId:'P6',quantity:1},{productId:'P2',quantity:1}]);assert.equal(custom.fee,5);assert.throws(()=>calculateCart({...s,settings:{...s.settings,extraFee:-1}},[{productId:'P6',quantity:1}]));});
test('multi-merchant checkout creates one order, one notification and one customer count',()=>{
 const s=initialState();const lines=[{productId:'P6',quantity:2},{productId:'P2',quantity:1}];
 const cart=calculateCart(s,lines);const result=createCustomerOrders(s,{...input,lines});
 assert.equal(result.orders.length,1);const order=result.orders[0];
 assert.equal(order.total,cart.total);assert.equal(order.deliveryFee,5);
 assert.equal(order.items.length,2);assert.equal(new Set(order.items.map(i=>i.merchantId)).size,2);
 assert.equal(result.state.notifications.length,s.notifications.length+1);
 assert.equal(result.state.catalog.customers.find(c=>c.id==='U-'+input.requestId).value,1);
 for(const l of lines)assert.equal(result.state.catalog.products.find(p=>p.id===l.productId).stock,s.catalog.products.find(p=>p.id===l.productId).stock);
 const retry=createCustomerOrders(result.state,{...input,lines});assert.deepEqual(retry.state,result.state);assert.equal(retry.orders.length,1);
 assert.throws(()=>createCustomerOrders(result.state,{...input,lines,clientSessionId:'other'}));
});
test('historical split requests remain idempotent',()=>{
 const s=initialState();const order={...s.orders[0],requestId:input.requestId+':R1',clientSessionId:input.clientSessionId};s.orders.unshift(order);
 assert.deepEqual(createCustomerOrders(s,input).orders,[order]);
});
test('free-delivery restaurants cost nothing and the next paid position still pays the first-position fee',()=>{
 const s=initialState();const merchantOf=id=>s.catalog.products.find(p=>p.id===id).merchantId;
 const free=s.catalog.restaurants.find(m=>m.id===merchantOf('P6'));free.freeDelivery=true;
 assert.equal(calculateCart(s,[{productId:'P6',quantity:1}]).fee,0);
 const mixed=calculateCart(s,[{productId:'P6',quantity:1},{productId:'P2',quantity:1}]);
 assert.deepEqual(mixed.baskets.map(b=>b.fee),[0,4]);assert.equal(mixed.fee,4);
});
test('restaurants follow their opening days and hours in Tunisia time, including after midnight',async()=>{
 const {isOpenNow}=await import('../features/admin/data/demo.ts');
 const m={id:'R',name:'R',detail:'',status:'ACTIVE',value:0,scheduleDays:['mon'],scheduleOpen:'11:00',scheduleClose:'23:00'};
 assert.equal(isOpenNow(m,new Date('2026-09-28T10:30:00Z')),true); // lundi 11:30 à Tunis
 assert.equal(isOpenNow(m,new Date('2026-09-28T09:30:00Z')),false); // lundi 10:30
 assert.equal(isOpenNow(m,new Date('2026-09-29T10:30:00Z')),false); // mardi
 const late={...m,scheduleOpen:'18:00',scheduleClose:'02:00'};
 assert.equal(isOpenNow(late,new Date('2026-09-28T23:30:00Z')),true); // mardi 00:30, ouverture de lundi
 assert.equal(isOpenNow(late,new Date('2026-09-29T23:30:00Z')),false); // mercredi 00:30, mardi fermé
 assert.equal(isOpenNow({...m,scheduleDays:undefined}),null);
});
test('a closed restaurant cannot receive an order',()=>{
 const s=initialState();const merchant=s.catalog.restaurants.find(m=>m.id===s.catalog.products.find(p=>p.id==='P6').merchantId);
 const days=['mon','tue','wed','thu','fri','sat','sun'];const today=days[(new Date(Date.now()+3600_000).getUTCDay()+6)%7];
 Object.assign(merchant,{scheduleDays:[days[(days.indexOf(today)+2)%7]],scheduleOpen:'11:00',scheduleClose:'12:00'});
 assert.throws(()=>calculateCart(s,[{productId:'P6',quantity:1}]),/fermé actuellement/);
 merchant.scheduleDays=undefined;
 assert.doesNotThrow(()=>calculateCart(s,[{productId:'P6',quantity:1}]));
});
test('checkout requires a real 8-digit Tunisian phone number',()=>{const s=initialState();for(const phone of ['','1234567','123456789','12345678','60000111','80000111','+21610000111'])assert.throws(()=>createCustomerOrders(s,{...input,customer:{...input.customer,phone}}),undefined,phone);for(const phone of ['20000111','+216 50 000 111','0021698765432','71234567','41234567','31234567'])assert.equal(createCustomerOrders(s,{...input,requestId:'phone-'+phone.replace(/\D/g,''),customer:{...input.customer,phone}}).orders[0].phone.length,8)});
