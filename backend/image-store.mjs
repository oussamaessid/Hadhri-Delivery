import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink,access} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {snapshot,saveSnapshot,forgetSnapshot} from './storage.mjs';
export const storedImagePattern=/^\/api\/v1\/uploads\/[a-f0-9]{64}\.webp$/;
const kinds=['restaurants','products','categories','departments'];
const invalid=()=>Object.assign(new Error('Image invalide. Choisissez une photo JPEG, PNG ou WebP.'),{status:400});
export function createImageStore(directory){
 async function atomic(name,bytes){
  await mkdir(directory,{recursive:true});
  const tmp=join(directory,'.'+randomUUID()+'.tmp');
  try{await writeFile(tmp,bytes,{flag:'wx',mode:0o600});await rename(tmp,join(directory,name))}finally{await unlink(tmp).catch(()=>{})}
 }
 async function put(image){
  if(!image?.startsWith('data:'))return image;
  const match=/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if(!match||image.length>400000)throw invalid();
  const input=Buffer.from(match[2],'base64');
  const hash=createHash('sha256').update(input).digest('hex');
  const url=`/api/v1/uploads/${hash}.webp`;
  if(await exists(url))return url;
  let output;
  try{output=await sharp(input,{limitInputPixels:40000000}).rotate().resize({width:720,height:720,fit:'inside',withoutEnlargement:true}).webp({quality:78,effort:3}).toBuffer()}catch{throw invalid()}
  // Originals are private and retained for recovery. Only the optimized WebP is public.
  await atomic(hash+'.original.'+match[1],input);
  await atomic(hash+'.webp',output);
  return url;
 }
 async function exists(url){if(!storedImagePattern.test(url||''))return false;try{await access(join(directory,url.split('/').at(-1)));return true}catch(e){if(e.code==='ENOENT')return false;throw e}}
 async function read(url){if(!storedImagePattern.test(url))return null;try{return await readFile(join(directory,url.split('/').at(-1)))}catch(e){if(e.code==='ENOENT')return null;throw e}}
 async function migrate(db){
  // Write files before changing rows; interrupted migrations are safe to repeat.
  const original=await snapshot(db),changes=[];
  let skipped=0;
  for(const kind of kinds)for(const record of original.data.catalog[kind])if(record.image?.startsWith('data:')){
   try{changes.push({kind,id:record.id,before:record.image,after:await put(record.image)})}catch(e){if(e.status!==400)throw e;skipped++}
  }
  if(changes.length)await db.transaction(async tx=>{
   await tx.query('SELECT revision FROM app_state WHERE id=1 FOR UPDATE');
   const {data}=await snapshot(tx),before=structuredClone(data);
   for(const change of changes){const row=data.catalog[change.kind].find(r=>r.id===change.id);if(row?.image===change.before)row.image=change.after}
   await saveSnapshot(tx,data,before);
   await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');
  });
  forgetSnapshot();return {migrated:changes.length,skipped};
 }
 async function backup(state){
  const urls=new Set(kinds.flatMap(kind=>state.catalog[kind].map(r=>r.image)).filter(url=>storedImagePattern.test(url||'')));
  const files={};for(const url of urls){const body=await read(url);if(!body)throw new Error('Image absente de la sauvegarde');files[url.split('/').at(-1)]=body.toString('base64')}
  return files;
 }
 return {put,exists,read,migrate,backup};
}

export async function restoreMediaFiles(directory,files={}){
 await mkdir(directory,{recursive:true});
 for(const [name,value] of Object.entries(files)){
  if(!/^[a-f0-9]{64}\.webp$/.test(name)||typeof value!=='string')throw new Error('Sauvegarde média invalide');
  const bytes=Buffer.from(value,'base64');
  await sharp(bytes,{limitInputPixels:40000000}).metadata();
  await writeFile(join(directory,name),bytes,{mode:0o600});
 }
}
