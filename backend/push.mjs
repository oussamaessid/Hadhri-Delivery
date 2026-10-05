import webpush from 'web-push';
import {createHash} from 'node:crypto';
import {z} from 'zod';
// Web Push for the Admin: the VAPID keys are created once and kept in the database, each browser that enables alerts is a subscription.
export const pushSubscription=z.object({endpoint:z.string().url().startsWith('https://').max(1000),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().min(1).max(200),auth:z.string().min(1).max(100)})});
const endpointHash=endpoint=>createHash('sha256').update(endpoint).digest('hex');
export async function configurePush(db){
 await db.exec('CREATE TABLE IF NOT EXISTS push_keys (id INT PRIMARY KEY, public_key VARCHAR(200) NOT NULL, private_key VARCHAR(200) NOT NULL)');
 await db.exec('CREATE TABLE IF NOT EXISTS admin_push_subscriptions (endpoint_hash CHAR(64) PRIMARY KEY, subscription TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
 const generated=webpush.generateVAPIDKeys();
 await db.query('INSERT IGNORE INTO push_keys VALUES(1,$1,$2)',[generated.publicKey,generated.privateKey]);
 const keys=(await db.query('SELECT public_key,private_key FROM push_keys WHERE id=1')).rows[0];
 const origin=process.env.APP_ORIGIN||'';
 const vapidDetails={subject:origin.startsWith('https://')?origin:'mailto:admin@localhost',publicKey:keys.public_key,privateKey:keys.private_key};
 return {
  publicKey:keys.public_key,
  subscribe:subscription=>db.query('INSERT INTO admin_push_subscriptions(endpoint_hash,subscription) VALUES($1,$2) ON DUPLICATE KEY UPDATE subscription=VALUES(subscription)',[endpointHash(subscription.endpoint),JSON.stringify(subscription)]),
  unsubscribe:endpoint=>db.query('DELETE FROM admin_push_subscriptions WHERE endpoint_hash=$1',[endpointHash(endpoint)]),
  // Never throws: a failed push must not fail the order. Expired browsers (404/410) are forgotten.
  async notify(payload){
   const rows=(await db.query('SELECT endpoint_hash,subscription FROM admin_push_subscriptions')).rows;
   await Promise.all(rows.map(async row=>{
    try{await webpush.sendNotification(JSON.parse(row.subscription),JSON.stringify(payload),{vapidDetails,TTL:3600,urgency:'high'})}
    catch(e){if([404,410].includes(e.statusCode))await db.query('DELETE FROM admin_push_subscriptions WHERE endpoint_hash=$1',[row.endpoint_hash]);else console.error('Push',e.statusCode||e.message)}
   }));
  },
 };
}
