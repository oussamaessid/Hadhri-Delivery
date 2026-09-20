export function toDataUrl(file:File,maxSize=900,quality=0.75):Promise<string>{
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
    resolve(canvas.toDataURL('image/jpeg',quality));
   };
   img.src=reader.result as string;
  };
  reader.readAsDataURL(file);
 });
}
