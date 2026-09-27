import {readFile} from 'node:fs/promises';
const tables=['merchants','categories','products','departments','customers','drivers','orders','notifications'];
async function saveAll(tx,state){
 for(const record of state.catalog.restaurants)await tx.query('INSERT INTO merchants VALUES($1,$2,$3) ON DUPLICATE KEY UPDATE kind=VALUES(kind),data=IF(merchants.data<=>VALUES(data),merchants.data,VALUES(data))',[record.id,'restaurants',JSON.stringify(record)]);
 for(const record of state.catalog.categories)await tx.query('INSERT INTO categories VALUES($1,$2,$3) ON DUPLICATE KEY UPDATE merchant_id=VALUES(merchant_id),data=IF(categories.data<=>VALUES(data),categories.data,VALUES(data))',[record.id,record.merchantId,JSON.stringify(record)]);
 for(const record of state.catalog.products)await tx.query('INSERT INTO products VALUES($1,$2,$3,$4) ON DUPLICATE KEY UPDATE merchant_id=VALUES(merchant_id),category_id=VALUES(category_id),data=IF(products.data<=>VALUES(data),products.data,VALUES(data))',[record.id,record.merchantId,record.categoryId,JSON.stringify(record)]);
 for(const table of ['departments','customers','drivers','orders','notifications'])for(const record of state.catalog[table]||state[table]||[])await tx.query(`INSERT INTO ${table} (id,data) VALUES($1,$2) ON DUPLICATE KEY UPDATE data=IF(${table}.data<=>VALUES(data),${table}.data,VALUES(data))`,[record.id,JSON.stringify(record)]);
 for(const table of [...tables].reverse()){const ids=table==='merchants'?state.catalog.restaurants.map(r=>r.id):(state.catalog[table]||state[table]).map(r=>r.id);if(ids.length)await tx.query(`DELETE FROM ${table} WHERE id NOT IN (?)`,[ids]);else await tx.query(`DELETE FROM ${table}`)}
 await tx.query('UPDATE app_state SET data=$1 WHERE id=1',[JSON.stringify({settings:state.settings,normalized:true})]);
}
const rowsOf=(state,table)=>table==='merchants'?state.catalog.restaurants:(state.catalog[table]||state[table]||[]);
const upsert={
 merchants:['(id,kind,data)',r=>[r.id,'restaurants',JSON.stringify(r)],'kind=VALUES(kind),data=VALUES(data)'],
 categories:['(id,merchant_id,data)',r=>[r.id,r.merchantId,JSON.stringify(r)],'merchant_id=VALUES(merchant_id),data=VALUES(data)'],
 products:['(id,merchant_id,category_id,data)',r=>[r.id,r.merchantId,r.categoryId,JSON.stringify(r)],'merchant_id=VALUES(merchant_id),category_id=VALUES(category_id),data=VALUES(data)'],
};
// With the previous state, only rows that actually changed are written, in batches: an order touches a few rows instead of the whole catalog.
export async function saveSnapshot(tx,state,before){
 if(!before)return saveAll(tx,state);
 for(const table of tables){
  const old=new Map(rowsOf(before,table).map(r=>[r.id,JSON.stringify(r)]));
  const changed=rowsOf(state,table).filter(r=>old.get(r.id)!==JSON.stringify(r));
  const [columns,values,update]=upsert[table]||['(id,data)',r=>[r.id,JSON.stringify(r)],'data=VALUES(data)'];
  for(let i=0;i<changed.length;i+=200)await tx.query(`INSERT INTO ${table} ${columns} VALUES ? ON DUPLICATE KEY UPDATE ${update}`,[changed.slice(i,i+200).map(values)]);
 }
 for(const table of [...tables].reverse()){const ids=new Set(rowsOf(state,table).map(r=>r.id));const removed=rowsOf(before,table).map(r=>r.id).filter(id=>!ids.has(id));if(removed.length)await tx.query(`DELETE FROM ${table} WHERE id IN (?)`,[removed])}
 if(JSON.stringify(state.settings)!==JSON.stringify(before.settings))await tx.query('UPDATE app_state SET data=$1 WHERE id=1',[JSON.stringify({settings:state.settings,normalized:true})]);
}
// In-memory copy of the last committed state, valid while its revision matches the database (every writer bumps the revision).
let cached=null;
export function rememberSnapshot(revision,data){if(!cached||revision>=cached.revision)cached={revision,data}}
export function forgetSnapshot(){cached=null}
export function cachedAt(revision){return cached?.revision===revision?cached:null}
// Read-only callers: the returned state is shared and must not be mutated.
export async function cachedSnapshot(db){
 const revision=(await db.query('SELECT revision FROM app_state WHERE id=1')).rows[0].revision;
 const hit=cachedAt(revision);if(hit)return hit;
 const fresh=await snapshot(db);rememberSnapshot(fresh.revision,fresh.data);return fresh;
}
export async function migrateStorage(db){await db.exec(await readFile(new URL('./migrations/002_relational_catalog.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('./migrations/004_departments.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('./migrations/005_restaurants_only.sql',import.meta.url),'utf8'));await db.transaction(async tx=>{const row=(await tx.query('SELECT data FROM app_state WHERE id=1 FOR UPDATE')).rows[0];if(!row.data.normalized)await saveSnapshot(tx,row.data)})}
export async function snapshot(connection){const read=async tx=>{const row=(await tx.query('SELECT data,revision FROM app_state WHERE id=1 LOCK IN SHARE MODE')).rows[0];const catalog={restaurants:[],categories:[],products:[],departments:[],customers:[],drivers:[]};const state={catalog,orders:[],notifications:[],settings:row.data.settings};for(const table of tables){const records=(await tx.query(`SELECT * FROM ${table} ORDER BY id`)).rows;if(table==='merchants')records.forEach(r=>catalog[r.kind].push(r.data));else if(table in catalog)catalog[table]=records.map(r=>r.data);else state[table]=records.map(r=>r.data)}state.orders.sort((a,b)=>b.date.localeCompare(a.date));state.notifications.sort((a,b)=>(b.date||'').localeCompare(a.date||''));return {data:state,revision:row.revision}};return connection.transaction?connection.transaction(read):read(connection)}
