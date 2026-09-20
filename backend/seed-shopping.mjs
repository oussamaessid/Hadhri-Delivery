import {departments} from '../features/customer/data/departments.ts';
import {snapshot,saveSnapshot} from './storage.mjs';
export async function seedShopping(db){
 await db.exec('CREATE TABLE IF NOT EXISTS seed_history(name VARCHAR(191) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
 await db.transaction(async tx=>{
  await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
  const migration='home-departments-photos-v3';
  if((await tx.query('SELECT name FROM seed_history WHERE name=$1',[migration])).rows.length)return;
  const {data:state}=await snapshot(tx);
  const alreadyUpdated=(await tx.query('SELECT name FROM seed_history WHERE name=$1',['home-departments-images-v2'])).rows.length>0;
  if(!alreadyUpdated)state.catalog.departments=departments.map((d,i)=>({id:d.id,name:d.name,detail:d.short,image:d.image,status:'ACTIVE',value:i}));
  else for(const row of state.catalog.departments){const preset=departments.find(d=>d.id===row.id);if(preset&&(!row.image||row.image===preset.image.replace('.jpg','.svg')))row.image=preset.image}

  const ids=new Set(state.catalog.departments.map(d=>d.id));
  for(const category of state.catalog.categories){
   if(category.department&&!ids.has(category.department))delete category.department;
   if(!category.department){
    const name=category.name.toLocaleLowerCase();
    if(/boisson|drinks/.test(name))category.department='drinks';
    else if(/fruits secs|amandes|noix|pistaches/.test(name))category.department='nuts';
    else if(/fruits|légumes|legumes/.test(name))category.department='produce';
    else if(/poissons|marée|seafood/.test(name))category.department='fish';
    else if(/volaille|poulets/.test(name))category.department='chicken';
   }
  }
  await saveSnapshot(tx,state);
  await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');
  await tx.query('INSERT INTO seed_history(name) VALUES($1)',[migration]);
 });
}
