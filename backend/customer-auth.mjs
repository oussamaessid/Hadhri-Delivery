import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {snapshot,saveSnapshot} from './storage.mjs';
import {firebaseConfig,verifyFirebaseToken} from './firebase.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const profile=a=>({id:a.id,name:a.name,email:a.email,phone:a.phone});
const phone=z.string().transform(s=>s.replace(/[\s.-]/g,'')).refine(s=>/^(\+216)?[0-9]{8}$/.test(s),'Numéro tunisien invalide');
export async function configureCustomers(db){
 for(const migration of ['003_customer_accounts.sql','007_remove_email_verification.sql','008_firebase_customers.sql'])await db.exec(await readFile(new URL('./migrations/'+migration,import.meta.url),'utf8'));
}
export async function currentCustomer(db,cookies){
 const token=cookies.hadhri_customer;if(!token)return null;
 return (await db.query("SELECT a.id,a.name,a.email,a.phone FROM sessions s JOIN customer_accounts a ON a.id=s.customer_id WHERE s.token=$1 AND s.role='customer' AND s.expires_at>now() AND s.firebase_uid=a.firebase_uid",[hash(token)])).rows[0]||null;
}
function setCookie(res,value){const existing=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',existing?[...([existing].flat()),value]:value)}
export function createCustomerAuth(verifyToken=verifyFirebaseToken){
 const attempts=new Map();
 return async function customerAuth({db,path,req,res,cookies,readBody,json,fail}){
  if(path==='/customer/firebase-config'&&req.method==='GET'){const config=firebaseConfig();json({configured:Boolean(config),config});return true}
  if(path==='/customer/me'&&req.method==='GET'){const account=await currentCustomer(db,cookies);json({customer:account?profile(account):null});return true}
  if(path==='/customer/logout'&&req.method==='POST'){
   if(cookies.hadhri_customer)await db.query("DELETE FROM sessions WHERE token=$1 AND role='customer'",[hash(cookies.hadhri_customer)]);
   setCookie(res,'hadhri_customer=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');json({ok:true});return true;
  }
  if(['/customer/register','/customer/login'].includes(path)&&req.method==='POST')fail('Utilisez la connexion Firebase depuis le site.',410);
  if(path==='/customer/profile'&&req.method==='PATCH'){
   const account=await currentCustomer(db,cookies);if(!account)fail('Connectez-vous pour modifier votre profil.',401);
   const input=z.object({name:z.string().trim().min(2).max(100),phone}).parse(await readBody(req));
   await db.transaction(async tx=>{
    await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
    await tx.query('UPDATE customer_accounts SET name=$1,phone=$2 WHERE id=$3',[input.name,input.phone,account.id]);
    const {data:state}=await snapshot(tx);const customer=state.catalog.customers.find(c=>c.id===account.id);
    if(customer){customer.name=input.name;customer.phone=input.phone;await saveSnapshot(tx,state);await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1')}
   });
   json({customer:{...profile(account),...input}});return true;
  }
  if(path!=='/customer/firebase-session'||req.method!=='POST')return false;
  const key=req.socket.remoteAddress;const now=Date.now();
  for(const [ip,rate] of attempts)if(now-rate.at>600000)attempts.delete(ip);
  const rate=attempts.get(key)||{at:now,count:0};attempts.set(key,rate);
  if(++rate.count>60)fail('Trop de tentatives. Réessayez dans dix minutes.',429);
  const input=z.object({idToken:z.string().min(1).max(16000),phone:phone.optional()}).parse(await readBody(req));
  const claims=await verifyToken(input.idToken);
  if(claims.email_verified!==true)fail('Confirmez votre adresse avec le lien reçu par email, puis réessayez.',403);
  if(!['password','google.com','facebook.com'].includes(claims.firebase?.sign_in_provider))fail('Méthode de connexion non autorisée.',403);
  const email=z.string().email().max(254).parse(claims.email).toLowerCase();
  const uid=z.string().min(1).max(128).parse(claims.uid);
  const lifetime=Math.min(3600,Math.floor(claims.exp-Date.now()/1000));
  if(!Number.isFinite(lifetime)||lifetime<=0)fail('Connexion expirée. Reconnectez-vous.',401);
  const account=await db.transaction(async tx=>{
   await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');
   let row=(await tx.query('SELECT * FROM customer_accounts WHERE firebase_uid=$1 OR email=$2',[uid,email])).rows;
   if(row.length>1||row[0]?.firebase_uid&&row[0].firebase_uid!==uid)fail('Cette adresse est déjà liée à un autre compte.',409);
   row=row[0];
   const {data:state}=await snapshot(tx);
   if(row&&state.catalog.customers.find(c=>c.id===row.id)?.status!=='ACTIVE')fail('Votre compte ne peut pas se connecter. Contactez Hadhri Delivery.',403);
   if(row){
    // A verified Firebase email may claim a legacy local account; existing orders keep their owner.
    await tx.query('UPDATE customer_accounts SET firebase_uid=$1,email=$2,password_hash=NULL,salt=NULL WHERE id=$3',[uid,email,row.id]);
    row=(await tx.query('SELECT * FROM customer_accounts WHERE id=$1',[row.id])).rows[0];
   }else{
    row={id:randomUUID(),email,name:typeof claims.name==='string'&&claims.name.trim()?claims.name.trim().slice(0,100):email.split('@')[0],phone:input.phone||''};
    await tx.query('INSERT INTO customer_accounts(id,email,name,phone,firebase_uid) VALUES($1,$2,$3,$4,$5)',[row.id,row.email,row.name,row.phone,uid]);
    state.catalog.customers.push({id:row.id,name:row.name,phone:row.phone,status:'ACTIVE',detail:'Monastir',value:0});
    await saveSnapshot(tx,state);await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');
   }
   return row;
  });
  if(cookies.hadhri_customer)await db.query("DELETE FROM sessions WHERE token=$1 AND role='customer'",[hash(cookies.hadhri_customer)]);
  const token=randomBytes(32).toString('hex');
  await db.query("INSERT INTO sessions(token,role,expires_at,customer_id,firebase_uid) VALUES($1,'customer',$2,$3,$4)",[hash(token),new Date(Date.now()+lifetime*1000),account.id,uid]);
  setCookie(res,`hadhri_customer=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${lifetime}${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);
  json({customer:profile(account)});return true;
 };
}
export const customerAuth=createCustomerAuth();
