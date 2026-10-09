// Compression target is advisory; only the API's size limit may reject an image.
const TARGET_LENGTH=80000;
const MAX_LENGTH=390000;
export function encodeImage(img:HTMLImageElement,maxSize=720,quality=0.76):string{
 const canvas=document.createElement('canvas');
 const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
 canvas.width=Math.max(1,Math.round(img.width*scale));
 canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Traitement de l’image impossible.');
 const draw=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);
 draw();
 let type='image/webp';
 let result=canvas.toDataURL(type,quality);
 if(!result.startsWith('data:image/webp;')){
  // Safari may decode WebP without being able to encode it. Use JPEG for photos,
  // but keep PNG for transparent logos instead of flattening their background.
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let transparent=false;
  for(let i=3;i<pixels.length;i+=4){if(pixels[i]<255){transparent=true;break}}
  type=transparent?'image/png':'image/jpeg';
  result=canvas.toDataURL(type,quality);
 }
 if(type!=='image/png')for(const q of [0.66,0.56]){
  if(result.length<=TARGET_LENGTH)break;
  result=canvas.toDataURL(type,q);
 }
 // A detailed photo above the target is still valid. Resize only when necessary
 // to stay below the backend limit, preserving useful resolution on iPhones.
 while(result.length>MAX_LENGTH&&Math.max(canvas.width,canvas.height)>128){
  canvas.width=Math.max(1,Math.round(canvas.width*0.8));
  canvas.height=Math.max(1,Math.round(canvas.height*0.8));
  draw();result=canvas.toDataURL(type,0.66);
 }
 if(!/^data:image\/(png|jpeg|webp);base64,/.test(result)||result.length>MAX_LENGTH)
  throw new Error('Cette image ne peut pas être compressée. Essayez une photo JPEG ou PNG.');
 return result;
}
export function toDataUrl(file:File,maxSize=720,quality=0.76):Promise<string>{
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith('image/'))return reject(new Error('Choisissez un fichier image.'));
  if(file.size>15*1024*1024)return reject(new Error('Image trop lourde (15 Mo maximum).'));
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('Fichier image invalide.'));
   img.onload=()=>{try{resolve(encodeImage(img,maxSize,quality))}catch(e){reject(e)}};
   img.src=reader.result as string;
  };
  reader.readAsDataURL(file);
 });
}
