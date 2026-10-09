import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import {createImageStore,restoreMediaFiles} from '../backend/image-store.mjs';
test('600 images persist independently of database, deduplicate and restore',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hadhri-media-'));
 try{
  const store=createImageStore(dir),records=[];
  for(let n=0;n<600;n++){
   const data=await sharp({create:{width:32,height:32,channels:4,background:{r:n%256,g:Math.floor(n/256),b:40,alpha:0.5}}}).png().toBuffer();
   const image='data:image/png;base64,'+data.toString('base64');
   const url=await store.put(image);records.push({image:url});
   assert.equal(await store.put(image),url);
  }
  assert.equal(new Set(records.map(r=>r.image)).size,600);
  assert.equal((await readdir(dir)).length,1200);
  const reopened=createImageStore(dir);
  assert.ok(await reopened.read(records[599].image));
  assert.equal(await reopened.read('/api/v1/uploads/../../etc/passwd'),null);
  await assert.rejects(()=>store.put('data:image/png;base64,AAAA'),/Image invalide/);
  const files=await reopened.backup({catalog:{products:records,restaurants:[],categories:[],departments:[]}});
  await restoreMediaFiles(join(dir,'restored'),files);
  assert.deepEqual(await createImageStore(join(dir,'restored')).read(records[0].image),await store.read(records[0].image));
  assert.equal((await sharp(await store.read(records[0].image)).metadata()).hasAlpha,true);
 }finally{await rm(dir,{recursive:true,force:true})}
});
