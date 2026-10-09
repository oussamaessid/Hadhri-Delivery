import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeImage} from '../features/admin/services/image.ts';
function browser(t,{alpha=255,encode}){
 const ctx={drawImage(){},getImageData(){return {data:new Uint8ClampedArray([20,50,80,alpha])}}};
 const canvas={width:0,height:0,getContext(){return ctx},toDataURL(type,q){return encode(type,q,this.width)}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){return canvas}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document});
 return canvas;
}
const data=(type,n)=>`data:${type};base64,`+'A'.repeat(n);
test('Safari without WebP encoding accepts detailed JPEG photos above the soft target',t=>{
 const canvas=browser(t,{encode:type=>data(type==='image/webp'?'image/png':type,type==='image/jpeg'?100000:600000)});
 const result=encodeImage({width:2400,height:1600});
 assert.ok(result.startsWith('data:image/jpeg;'));assert.ok(result.length<390000);assert.equal(canvas.width,720);
});
test('transparent Safari logos remain PNG and are resized only to the API limit',t=>{
 const canvas=browser(t,{alpha:100,encode:(type,q,width)=>data('image/png',width>400?500000:120000)});
 const result=encodeImage({width:1600,height:1600});
 assert.ok(result.startsWith('data:image/png;'));assert.ok(result.length>40000);assert.ok(result.length<390000);assert.ok(canvas.width<=400);
});
test('WebP encoding keeps small images at their original resolution',t=>{
 const canvas=browser(t,{encode:type=>data(type,20000)});
 assert.ok(encodeImage({width:300,height:200}).startsWith('data:image/webp;'));assert.equal(canvas.width,300);
});
