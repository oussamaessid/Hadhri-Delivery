import {snapshot,saveSnapshot} from './storage.mjs';
export async function seedRestaurantLogos(db){
 await db.transaction(async tx=>{
  await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
  const migration='restaurant-logos-2026-09-13-v1';
  if((await tx.query('SELECT name FROM seed_history WHERE name=$1',[migration])).rows.length)return;
  const {data}=await snapshot(tx);
  const presets=[['mix-max-food','Mix Max Food'],['mamma-chami','Mamma Chami'],['o-pizza','O’Pizza'],['piri-piri','Piri’Piri']];
  const normalize=s=>s.toLowerCase().replace(/[^a-z]/g,'').replace('mamma','mama');
  for(const [slug,name] of presets){
   let row=data.catalog.restaurants.find(r=>normalize(r.name)===normalize(name));
   if(!row){row={id:`restaurant-${slug}`,name,status:'ACTIVE',detail:'Restaurant · Monastir',value:4.6};data.catalog.restaurants.push(row)}
   row.name=name;if('nameArabic' in row)delete row.nameArabic;row.image=`/images/restaurants/${slug}.jpeg`;row.imageFit='contain';
   row.translations={...row.translations};
   row.translations['fr']={...row.translations['fr'],name};
   for(const kind of ['categories','products'])for(const item of data.catalog[kind].filter(p=>p.merchantId===row.id)){
    item.merchant=name;item.detail=name;
    item.translations??={};item.translations['fr']={...item.translations['fr'],detail:name}
   }
  }
  await saveSnapshot(tx,data);
  await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');
  await tx.query('INSERT INTO seed_history(name) VALUES($1)',[migration]);
 });
}
