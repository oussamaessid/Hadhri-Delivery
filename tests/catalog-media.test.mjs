import test from 'node:test';
import assert from 'node:assert/strict';
import {withMediaUrls} from '../backend/catalog-media.mjs';
test('public catalogue uses small versioned image URLs without changing stored uploads',()=>{
 const raw={products:[{id:'p/1',image:'data:image/png;base64,'+'A'.repeat(1_000_000),name:'Produit'}],restaurants:[{id:'r1',image:'https://example.test/logo.png'}]};
 const compact=withMediaUrls(raw);
 assert.ok(JSON.stringify(compact).length<500);
 assert.match(compact.products[0].image,/^\/api\/v1\/media\/products\/p%2F1\?v=[a-f0-9]{12}&format=webp$/);
 assert.equal(raw.products[0].image.length,1_000_022);
 assert.equal(compact.restaurants[0].image,raw.restaurants[0].image);
 assert.equal(withMediaUrls(raw).products[0].image,compact.products[0].image);
 const changed=withMediaUrls({...raw,products:[{...raw.products[0],image:'data:image/png;base64,AAAA'}]});
 assert.notEqual(changed.products[0].image,compact.products[0].image);
});

test('admin updates keep original uploads only for the exact current image reference',async()=>{
 const {restoreStoredImage}=await import('../backend/catalog-media.mjs');
 const original={id:'one',image:'data:image/png;base64,AAAA'};
 const reference=withMediaUrls({products:[original]}).products[0];
 assert.equal(restoreStoredImage('products',{...reference,name:'Updated'},original).image,original.image);
 const foreign=withMediaUrls({products:[{...original,id:'two'}]}).products[0];
 assert.equal(restoreStoredImage('products',foreign,original).image,foreign.image);
 assert.equal(restoreStoredImage('products',{...reference,image:''},original).image,'');
 assert.equal(restoreStoredImage('products',{...reference,image:'data:image/png;base64,BBBB'},original).image,'data:image/png;base64,BBBB');
});
