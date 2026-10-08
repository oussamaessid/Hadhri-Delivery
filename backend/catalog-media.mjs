import {createHash} from 'node:crypto';
const mediaUrls=new Map();
export function withMediaUrls(catalog){return Object.fromEntries(Object.entries(catalog).map(([kind,items])=>[kind,items.map(e=>{if(!e.image?.startsWith('data:'))return e;const key=`${kind}/${e.id}`;let hit=mediaUrls.get(key);if(hit?.image!==e.image){hit={image:e.image,url:`/api/v1/media/${kind}/${encodeURIComponent(e.id)}?v=${createHash('sha256').update(e.image).digest('hex').slice(0,12)}`};mediaUrls.set(key,hit)}return {...e,image:hit.url}})]))}

const mediaKinds=['restaurants','products','categories','departments'];
export function adminStateView(state){
 return {...state,catalog:{...state.catalog,...withMediaUrls(Object.fromEntries(mediaKinds.map(kind=>[kind,state.catalog[kind]])))}};
}
// Only an exact reference to this row's current image may stand in for its stored upload.
export function restoreStoredImage(kind,value,current){
 if(!mediaKinds.includes(kind)||!current?.image?.startsWith('data:')||!value||typeof value!=='object')return value;
 const reference=withMediaUrls({[kind]:[current]})[kind][0].image;
 return value.image===reference?{...value,image:current.image}:value;
}
