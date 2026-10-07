import {createHash} from 'node:crypto';
const mediaUrls=new Map();
export function withMediaUrls(catalog){return Object.fromEntries(Object.entries(catalog).map(([kind,items])=>[kind,items.map(e=>{if(!e.image?.startsWith('data:'))return e;const key=`${kind}/${e.id}`;let hit=mediaUrls.get(key);if(hit?.image!==e.image){hit={image:e.image,url:`/api/v1/media/${kind}/${encodeURIComponent(e.id)}?v=${createHash('sha256').update(e.image).digest('hex').slice(0,12)}`};mediaUrls.set(key,hit)}return {...e,image:hit.url}})]))}
