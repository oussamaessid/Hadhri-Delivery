export function toDataUrl(file:File,maxSize=720,quality=0.76):Promise<string>{
 return new Promise((resolve,reject)=>{
  if(!file.type.startsWith('image/'))return reject(new Error('Choisissez un fichier image.'));
  if(file.size>15*1024*1024)return reject(new Error('Image trop lourde (15 Mo maximum).'));
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('Fichier image invalide.'));
   img.onload=()=>{
    const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx)return reject(new Error('Traitement de l’image impossible.'));
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let result=canvas.toDataURL('image/webp',quality);
    // Keep transparency on browsers that cannot encode WebP (PNG fallback).
    if(!result.startsWith('data:image/webp'))result=canvas.toDataURL('image/png');
    else for(const q of [0.66,0.56]){if(result.length<=40000)break;result=canvas.toDataURL('image/webp',q)}
    while(result.length>40000&&Math.max(canvas.width,canvas.height)>240){
     canvas.width=Math.max(1,Math.round(canvas.width*0.8));canvas.height=Math.max(1,Math.round(canvas.height*0.8));
     ctx.drawImage(img,0,0,canvas.width,canvas.height);
     result=canvas.toDataURL(result.startsWith('data:image/webp')?'image/webp':'image/png',0.66);
    }
    if(result.length>40000)return reject(new Error('Image trop détaillée. Choisissez une image plus petite.'));
    resolve(result);
   };
   img.src=reader.result as string;
  };
  reader.readAsDataURL(file);
 });
}
