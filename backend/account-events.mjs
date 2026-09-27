import {readFile} from 'node:fs/promises';
import {snapshot} from './storage.mjs';
import {accountEvents,backfillAccountEvents,applyLoyaltyEvents} from '../features/customer/services/account-history.ts';
// Journal par compte et état fidélité enregistré : tables séparées des commandes, jamais effacées par une remise à zéro des commandes.
async function save(tx,events){
 if(!events.length)return;
 for(const e of events)await tx.query('INSERT INTO account_events(account_id,type,created_at,data) VALUES($1,$2,$3,$4)',[e.accountId,e.type,e.date,JSON.stringify(e)]);
 const ids=[...new Set(events.filter(e=>e.type.startsWith('LOYALTY_')).map(e=>e.accountId))];
 if(!ids.length)return;
 const states=new Map((await tx.query('SELECT data FROM customer_loyalty WHERE account_id IN (?) FOR UPDATE',[ids])).rows.map(r=>[r.data.accountId,r.data]));
 applyLoyaltyEvents(states,events);
 for(const id of ids)await tx.query('INSERT INTO customer_loyalty(account_id,data) VALUES($1,$2) ON DUPLICATE KEY UPDATE data=VALUES(data)',[id,JSON.stringify(states.get(id))]);
}
export async function configureAccountEvents(db){
 await db.exec(await readFile(new URL('./migrations/009_account_events.sql',import.meta.url),'utf8'));
 await db.exec('CREATE TABLE IF NOT EXISTS seed_history(name VARCHAR(191) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
 await db.transaction(async tx=>{
  await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
  const migration='account-events-backfill-v1';
  if((await tx.query('SELECT name FROM seed_history WHERE name=$1',[migration])).rows.length)return;
  const {data}=await snapshot(tx);
  await save(tx,backfillAccountEvents(data));
  await tx.query('INSERT INTO seed_history(name) VALUES($1)',[migration]);
 });
}
export const recordAccountEvents=(tx,before,after)=>save(tx,accountEvents(before,after));
export async function accountHistory(db,accountId){
 const events=(await db.query('SELECT data FROM account_events WHERE account_id=$1 ORDER BY id DESC LIMIT 500',[accountId])).rows.map(r=>r.data);
 const loyalty=(await db.query('SELECT data FROM customer_loyalty WHERE account_id=$1',[accountId])).rows[0]?.data||null;
 return {events,loyalty};
}
export async function loyaltyStates(db){return (await db.query('SELECT data FROM customer_loyalty')).rows.map(r=>r.data)}
