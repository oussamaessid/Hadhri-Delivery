import sharp from 'sharp';
import {createHash} from 'node:crypto';
// Bound CPU and memory even when a large catalogue is opened on several devices.
const cache=new Map(),pending=new Map(),waiting=[];
let active=0,bytes=0;
const limit=16*1024*1024;
async function slot(){if(active>=2)await new Promise(resolve=>waiting.push(resolve));else active++}
function release(){const next=waiting.shift();if(next)next();else active--}
export async function thumbnail(image){
 const key=createHash('sha256').update(image).digest('hex');
 if(cache.has(key)){const hit=cache.get(key);cache.delete(key);cache.set(key,hit);return hit}
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{
  await slot();
  try{
   const match=/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/s.exec(image);
   if(!match)throw new Error('Invalid image');
   const original=Buffer.from(match[2],'base64');
   let result={body:original,type:match[1]};
   try{
    const body=await sharp(original,{limitInputPixels:40000000}).rotate().resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).webp({quality:76,effort:3}).toBuffer();
    if(body.length<original.length)result={body,type:'image/webp'};
   }catch{/* A malformed legacy upload must not take down catalogue requests. */}
   if(result.body.length<=limit){cache.set(key,result);bytes+=result.body.length;while(bytes>limit||cache.size>256){const oldest=cache.keys().next().value;bytes-=cache.get(oldest).body.length;cache.delete(oldest)}}
   return result;
  }finally{release();pending.delete(key)}
 })();
 pending.set(key,task);return task;
}
