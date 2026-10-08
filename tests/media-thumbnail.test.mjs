import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {thumbnail} from '../backend/media-thumbnail.mjs';
test('catalogue thumbnails are small, preserve transparency and reuse cached work',async()=>{
 const original=await sharp({create:{width:1600,height:1000,channels:4,background:{r:30,g:90,b:200,alpha:.5}}}).png().toBuffer();
 const image='data:image/png;base64,'+original.toString('base64');
 const [a,b]=await Promise.all([thumbnail(image),thumbnail(image)]);
 assert.equal(a,b);assert.equal(a.type,'image/webp');assert.ok(a.body.length<original.length);
 const info=await sharp(a.body).metadata();assert.equal(info.width,640);assert.equal(info.height,400);assert.equal(info.hasAlpha,true);
 assert.equal(await thumbnail(image),a);
});
test('invalid legacy image data does not crash the media endpoint',async()=>{
 const result=await thumbnail('data:image/png;base64,AAAA');
 assert.equal(result.type,'image/png');assert.equal(result.body.length,3);
});
