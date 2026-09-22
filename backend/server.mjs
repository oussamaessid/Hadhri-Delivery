import {bootstrapState} from './bootstrap-state.mjs';
import {encodeBackup} from './backup-crypto.mjs';
import {localizeState,resolveLocale,seedEntityTranslations} from '../lib/i18n/catalog.ts';
import {createServer} from 'node:http';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {resolve,join} from 'node:path';
import {mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import {z} from 'zod';
import {WebSocketServer} from 'ws';
import {migrateStorage,snapshot,saveSnapshot} from './storage.mjs';
import {seedRestaurantLogos} from './seed-restaurant-logos.mjs';
import {seedShopping} from './seed-shopping.mjs';
import {configureCustomers,createCustomerAuth,currentCustomer} from './customer-auth.mjs';
import {connectDatabase} from './database.mjs';
import {initialState} from '../features/admin/data/demo.ts';
import {createCustomerOrders} from '../features/customer/services/checkout.ts';
export async function startServer({dataDir=process.env.DATA_DIR||'.data/mysql',port=Number(process.env.API_PORT||3001),verifyToken,database}={}){
if(process.env.NODE_ENV==='production'&&!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY||''))throw new Error('BACKUP_ENCRYPTION_KEY requis en production');
const seedDemo=process.env.SEED_DEMO_DATA==='true'||(process.env.SEED_DEMO_DATA===undefined&&process.env.NODE_ENV!=='production');
const customerAuth=createCustomerAuth(verifyToken);
const db=await connectDatabase({database});
await db.query('INSERT IGNORE INTO app_state(id,data) VALUES(1,$1)',[JSON.stringify(bootstrapState(initialState,seedDemo))]);
await migrateStorage(db);
await seedShopping(db);
if(seedDemo)await seedRestaurantLogos(db);
await configureCustomers(db);
await db.transaction(async tx=>{const {data}=await snapshot(tx);for(const key of ['restaurants','departments','categories','products'])data.catalog[key]=data.catalog[key].map(seedEntityTranslations);await saveSnapshot(tx,data)});
const backupsDir=join(resolve(dataDir),'..','backups');
async function backupSnapshot(){
 try{
  const {data}=await snapshot(db);
  await mkdir(backupsDir,{recursive:true});
  const file=join(backupsDir,'snapshot-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  await writeFile(file,process.env.BACKUP_ENCRYPTION_KEY?encodeBackup(data,process.env.BACKUP_ENCRYPTION_KEY):JSON.stringify(data),{mode:0o600});
  const files=(await readdir(backupsDir)).filter(f=>f.startsWith('snapshot-')).sort();
  for(const old of files.slice(0,-10))await unlink(join(backupsDir,old));
  console.log('[backup] snapshot enregistré :',file);
 }catch(e){console.error('[backup] échec',e)}
}
await backupSnapshot();
const backupTimer=setInterval(backupSnapshot,60*60*1000);
const text=z.string().trim().min(1).max(500), identifier=z.string().min(1).max(100);
const translation=z.object({name:z.string().trim().max(100).optional(),description:z.string().trim().max(1000).optional(),detail:z.string().trim().max(500).optional()}).strict();
const entity=z.object({translations:z.object({ar:translation.optional(),en:translation.optional(),fr:translation.optional()}).strict().optional(),id:identifier,name:z.string().trim().min(2).max(100),status:z.enum(['ACTIVE','INACTIVE','AVAILABLE','BUSY','OFFLINE','SUSPENDED']),detail:z.string().max(500),value:z.number().finite().min(0).max(100000),stock:z.number().int().min(0).max(1000000).optional(),merchantId:identifier.optional(),categoryId:identifier.optional(),image:z.string().max(400000).refine(s=>!s||s.startsWith('/images/')||/^https:\/\//.test(s)||/^data:image\/(png|jpe?g|webp);base64,/.test(s)).optional(),icon:z.string().max(8).optional(),description:z.string().max(1000).optional(),variants:z.array(z.object({id:identifier,name:text,price:z.number().min(0).max(10000)})).max(20).optional(),scheduleDays:z.array(z.enum(['mon','tue','wed','thu','fri','sat','sun'])).max(7).optional(),scheduleOpen:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),scheduleClose:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional() ,imageFit:z.enum(['contain','cover']).optional(),phone:z.string().max(100).optional(),department:z.string().max(100).optional(),category:z.string().max(100).optional(),merchant:z.string().max(100).optional(),vehicle:z.string().max(100).optional(),zone:z.string().max(500).optional()}).strict();
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
async function readBody(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2e6)fail('Requête trop volumineuse',413)}try{return JSON.parse(raw||'{}')}catch{fail('JSON invalide')}}
async function transaction(fn){return db.transaction(async tx=>{await tx.query('SELECT id FROM app_state WHERE id=1 FOR UPDATE');const row=await snapshot(tx);const result=await fn(row.data,row.revision);await saveSnapshot(tx,result.state);await tx.query('UPDATE app_state SET revision=revision+1 WHERE id=1');return result.value})}
function validateCatalog(state){const imageBytes=Object.values(state.catalog).flat().reduce((n,p)=>n+(p.image?.startsWith('data:')?Buffer.byteLength(p.image):0),0);if(imageBytes>20*1024*1024)fail('Quota des images atteint (20 Mo). Utilisez des URLs HTTPS pour les nouvelles images.',413);for(const kind of ['products','categories'])for(const p of state.catalog[kind]){if(!p.merchantId)fail('Sélectionnez un commerce');const m=state.catalog.restaurants.find(m=>m.id===p.merchantId);if(!m)fail('Ce commerce contient encore des catégories ou produits.');p.merchant=m.name;p.detail=m.name;if(kind==='products'){p.detail=m.name;const c=state.catalog.categories.find(c=>c.id===p.categoryId&&c.merchantId===p.merchantId);if(!c)fail('Choisissez une catégorie de ce commerce.');p.category=c.name}}}
await db.exec('CREATE TABLE IF NOT EXISTS admin_login_limits (id VARCHAR(100) PRIMARY KEY, attempts INT NOT NULL, started_at BIGINT NOT NULL)');
async function consumeLoginAttempt(key){
 return db.transaction(async tx=>{
  const now=Date.now();
  await tx.query('DELETE FROM admin_login_limits WHERE started_at<$1',[now-600000]);
  await tx.query('INSERT IGNORE INTO admin_login_limits VALUES($1,0,$2)',[key,now]);
  const row=(await tx.query('SELECT attempts FROM admin_login_limits WHERE id=$1 FOR UPDATE',[key])).rows[0];
  await tx.query('UPDATE admin_login_limits SET attempts=attempts+1 WHERE id=$1',[key]);
  return row.attempts<20;
 });
}
const server=createServer(async(req,res)=>{
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 try{
 const url=new URL(req.url,'http://localhost');const path=url.pathname.replace(/^\/api\/v1/,'');const language=resolveLocale(url.searchParams.get('lang'));
 if(req.method==='GET'&&path==='/health'){await db.query('SELECT 1');return json({status:'ok',database:'MySQL',persistent:true})}
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host&&!['http://localhost:5173','http://127.0.0.1:5173',process.env.APP_ORIGIN].includes(origin.origin))fail('Origine refusée',403)}
 const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>{const i=s.indexOf('=');return i<0?['','']:[s.slice(0,i).trim(),s.slice(i+1).trim()]}));
 let token=cookies.hadhri_session;
 let session=token?(await db.query('SELECT role FROM sessions WHERE token=$1 AND expires_at>now()',[hash(token)])).rows[0]:null;
 const cookie=async role=>{token=randomBytes(32).toString('hex');await db.query('INSERT INTO sessions(token,role,expires_at) VALUES($1,$2,NOW()+INTERVAL 1 DAY)',[hash(token),role]);res.setHeader('Set-Cookie',`hadhri_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);session={role}};
 if(!session)await cookie('guest');
 if(await customerAuth({db,path,req,res,cookies,readBody,json,fail}))return;
 const customerAccount=await currentCustomer(db,cookies);
 if(path==='/auth/status'&&req.method==='GET')return json({authenticated:session.role==='admin',setupRequired:!(await db.query('SELECT id FROM admin_account')).rows.length});
 if(['/auth/setup','/auth/login'].includes(path)&&req.method==='POST'){
  if(!await consumeLoginAttempt('admin'))fail('Réessayez dans dix minutes',429);
  const {password}=z.object({password:z.string().min(12).max(200)}).parse(await readBody(req));const account=(await db.query('SELECT * FROM admin_account')).rows[0];
  if(path==='/auth/setup'){if(account)fail('Compte déjà créé',409);const salt=randomBytes(16).toString('hex');await db.query('INSERT INTO admin_account VALUES(1,$1,$2)',[scryptSync(password,salt,64).toString('hex'),salt])}
  else if(!account||(Buffer.from(account.password_hash,'hex').length!==64||!timingSafeEqual(Buffer.from(account.password_hash,'hex'),scryptSync(password,account.salt,64))))fail('Mot de passe incorrect',401);
  await db.query('DELETE FROM sessions WHERE token=$1',[hash(token)]);await cookie('admin');return json({ok:true});
 }
 if(path==='/auth/logout'&&req.method==='POST'){await db.query('DELETE FROM sessions WHERE token=$1',[hash(token)]);await cookie('guest');return json({ok:true})}
 if(path.startsWith('/admin')&&session.role!=='admin')fail('Connexion administrateur requise',401);
 if(path==='/state'&&req.method==='GET'){const {data,revision}=await snapshot(db);return json({state:localizeState({...data,catalog:{restaurants:data.catalog.restaurants,products:data.catalog.products,categories:data.catalog.categories,departments:data.catalog.departments,customers:[],drivers:[]},orders:data.orders.filter(o=>customerAccount&&o.customerAccountId===customerAccount.id),notifications:[],settings:{name:data.settings.name,email:'',fee:data.settings.fee,loyaltyEnabled:data.settings.loyaltyEnabled!==false}},language),revision})}
 if(req.method==='GET'&&/^\/(restaurants|products|categories|departments)(\/[^/]+)?$/.test(path)){const raw=await snapshot(db);const data=localizeState(raw.data,language);const [,kind,id]=path.split('/');let items=data.catalog[kind];if(url.searchParams.get('merchantId'))items=items.filter(p=>p.merchantId===url.searchParams.get('merchantId'));if(url.searchParams.get('q'))items=items.filter(p=>(p.name+' '+p.detail+' '+(p.category||'')).toLowerCase().includes(url.searchParams.get('q').toLowerCase()));if(id){const item=items.find(p=>p.id===id);if(!item)fail('Élément introuvable',404);return json(kind==='restaurants'?{...item,categories:data.catalog.categories.filter(c=>c.merchantId===id&&c.department!=='drinks'),products:data.catalog.products.filter(p=>p.merchantId===id&&!data.catalog.categories.some(c=>c.id===p.categoryId&&c.department==='drinks'))}:item)}const total=items.length;if(url.searchParams.has('limit')||url.searchParams.has('offset')){const limit=z.coerce.number().int().min(1).max(100).parse(url.searchParams.get('limit')||50);const offset=z.coerce.number().int().min(0).parse(url.searchParams.get('offset')||0);return json({items:items.slice(offset,offset+limit),total,limit,offset})}return json({items,total})}
 if(path==='/admin/state'&&req.method==='GET'){const {data,revision}=await snapshot(db);return json({state:data,revision})}
 if(path==='/orders'&&req.method==='POST'){
  if(!customerAccount)fail('Connectez-vous ou créez un compte pour confirmer votre commande.',401);
  const input=z.object({requestId:z.string().uuid(),lines:z.array(z.object({productId:identifier,quantity:z.number().int().min(1).max(10000),variantId:identifier.optional()})).min(1).max(100),customer:z.object({name:text,phone:text,address:text,notes:z.string().max(500)}),useLoyaltyDiscount:z.boolean().optional()}).parse(await readBody(req));
  const orders=await transaction(state=>{if(state.catalog.customers.find(c=>c.id===customerAccount.id)?.status!=='ACTIVE')fail('Votre compte ne peut pas passer de commande.',403);let result;try{result=createCustomerOrders(state,{...input,clientSessionId:customerAccount.id,customerAccountId:customerAccount.id})}catch(e){fail(e.message)}return {state:result.state,value:result.orders}});broadcastOrders(orders);return json(orders,201);
 }
 if(path==='/admin/state'&&req.method==='PATCH'){
  const body=z.object({revision:z.number().int(),changes:z.array(z.object({kind:z.enum(['restaurants','products','categories','departments','customers','drivers','orders','notifications','settings']),id:identifier.optional(),value:z.unknown().nullable()})).max(100)}).parse(await readBody(req));
  const changedOrders=[];
  await transaction((state,revision)=>{if(body.revision!==revision)fail('Les données ont changé. Rechargez puis réessayez.',409);for(const change of [...body.changes].sort((a,b)=>Number(b.kind==='orders')-Number(a.kind==='orders'))){const {kind,id,value}=change;if(kind==='settings'){state.settings=z.object({name:text,email:z.string().email(),fee:z.number().min(0).max(1000),loyaltyEnabled:z.boolean().optional()}).parse(value);continue}const records=state.catalog[kind]||state[kind];const index=records.findIndex(x=>x.id===id);if(value===null){if(kind==='orders')fail('Les commandes historiques ne peuvent pas être supprimées.');if(index>=0)records.splice(index,1);continue}const record=kind==='orders'?z.object({id:identifier,status:z.enum(['PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY','DELIVERED','CANCELLED']),driver:z.string().max(100)}).passthrough().parse(value):kind==='notifications'?z.object({id:identifier,title:text,detail:text,type:text,read:z.boolean()}).passthrough().parse(value):entity.parse(value);if(record.id!==id)fail('Identifiant invalide');if(kind==='orders'){if(index<0)fail('Commande inconnue');const current=records[index];const steps=['PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY','DELIVERED'];if(record.status!==current.status&&(current.status==='DELIVERED'||current.status==='CANCELLED'||(record.status!=='CANCELLED'&&steps.indexOf(record.status)!==steps.indexOf(current.status)+1)))fail('Transition de commande invalide');if(['DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY','DELIVERED'].includes(record.status)&&!record.driver)fail('Un livreur est nécessaire');if(record.driver&&record.driver!==current.driver){const driver=state.catalog.drivers.find(d=>d.name===record.driver);if(!driver||driver.status!=='AVAILABLE')fail('Livreur indisponible');driver.status='BUSY'}if(['DELIVERED','CANCELLED'].includes(record.status)&&!['DELIVERED','CANCELLED'].includes(current.status)){const driver=state.catalog.drivers.find(d=>d.name===current.driver);if(driver&&!state.orders.some(o=>o.id!==current.id&&o.driver===driver.name&&!['DELIVERED','CANCELLED'].includes(o.status)))driver.status='AVAILABLE';if(record.status==='CANCELLED')for(const item of current.items){const p=state.catalog.products.find(p=>p.id===item.productId);if(p)p.stock+=item.quantity}}const updated={...current,status:record.status,driver:record.driver};if(updated.status!==current.status||updated.driver!==current.driver)changedOrders.push(updated);records[index]=updated;continue}if(index>=0)records[index]=record;else records.unshift(record)}validateCatalog(state);return {state}});broadcastOrders(changedOrders);for(const o of changedOrders)if(o.customerAccountId)broadcastCustomerOrders(o.customerAccountId,[o]);return json({ok:true});
 }
 fail('Route introuvable',404);
 }catch(e){const status=e.status|| (e instanceof z.ZodError?400:500);if(status===500)console.error(e);json({error:status===500?'Erreur du serveur':e instanceof z.ZodError?'Données invalides : '+e.issues.map(i=>i.path.join('.')+' '+i.message).join(', '):e.message},status)}
});
const wss=new WebSocketServer({noServer:true,maxPayload:16384});
const adminSockets=new Set();
const customerSockets=new Map();
function broadcastOrders(orders){if(!orders?.length)return;console.log('[ws] diffusion de',orders.length,'commande(s) à',adminSockets.size,'admin(s) connecté(s)');const payload=JSON.stringify({type:'orders',orders});for(const ws of adminSockets)if(ws.readyState===ws.OPEN)ws.send(payload)}
function broadcastCustomerOrders(customerAccountId,orders){const sockets=customerSockets.get(customerAccountId);if(!sockets?.size||!orders?.length)return;const mine=orders.filter(o=>o.customerAccountId===customerAccountId);if(!mine.length)return;console.log('[ws] mise à jour de',mine.length,'commande(s) pour le client',String(customerAccountId).slice(0,8));const payload=JSON.stringify({type:'order-status',orders:mine.map(o=>({id:o.id,status:o.status,driver:o.driver,total:o.total,merchant:o.merchant}))});for(const ws of sockets)if(ws.readyState===ws.OPEN)ws.send(payload)}
server.on('upgrade',async(req,socket,head)=>{
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname.replace(/^\/api\/v1/,'');
  if(path!=='/admin/stream'&&path!=='/customer/stream'){console.log('[ws] rejeté : chemin inconnu',path);return socket.destroy()}
  if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host&&!['http://localhost:5173','http://127.0.0.1:5173',process.env.APP_ORIGIN].includes(origin.origin)){console.log('[ws] rejeté : origine refusée',req.headers.origin,'attendu host',req.headers.host);return socket.destroy()}}
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>{const i=s.indexOf('=');return i<0?['','']:[s.slice(0,i).trim(),s.slice(i+1).trim()]}));
  if(path==='/customer/stream'){
   const customer=cookies.hadhri_customer?(await db.query("SELECT customer_id FROM sessions WHERE token=$1 AND role='customer' AND expires_at>now()",[hash(cookies.hadhri_customer)])):null;
   const customerId=customer?.rows[0]?.customer_id;
   if(!customerId){console.log('[ws] rejeté : session client invalide ou absente');return socket.destroy()}
   wss.handleUpgrade(req,socket,head,ws=>{if(!customerSockets.has(customerId))customerSockets.set(customerId,new Set());customerSockets.get(customerId).add(ws);console.log('[ws] client connecté pour le suivi, total:',customerSockets.get(customerId).size);const drop=()=>{customerSockets.get(customerId)?.delete(ws);if(!customerSockets.get(customerId)?.size)customerSockets.delete(customerId)};ws.on('close',drop);ws.on('error',e=>{console.error('[ws] erreur socket client',e.message);drop()})});
   return;
  }
  const session=cookies.hadhri_session?(await db.query('SELECT role FROM sessions WHERE token=$1 AND expires_at>now()',[hash(cookies.hadhri_session)])).rows[0]:null;
  if(!session||session.role!=='admin'){console.log('[ws] rejeté : session admin invalide ou absente');return socket.destroy()}
  wss.handleUpgrade(req,socket,head,ws=>{adminSockets.add(ws);console.log('[ws] admin connecté, total:',adminSockets.size);ws.on('close',(code,reason)=>{adminSockets.delete(ws);console.log('[ws] admin déconnecté, code:',code,'raison:',reason.toString()||'(aucune)','total:',adminSockets.size)});ws.on('error',e=>{console.error('[ws] erreur socket',e.message);adminSockets.delete(ws)})});
 }catch(e){console.error('[ws] erreur upgrade',e);socket.destroy()}
});
const heartbeat=setInterval(()=>{for(const ws of adminSockets)ws.ping();for(const sockets of customerSockets.values())for(const ws of sockets)ws.ping()},30000);
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,process.env.API_HOST||'127.0.0.1',resolve)});
console.log('Hadhri API ready on port '+server.address().port);
return {server,db,close:()=>new Promise((resolve,reject)=>{clearInterval(heartbeat);clearInterval(backupTimer);for(const ws of adminSockets)ws.terminate();for(const sockets of customerSockets.values())for(const ws of sockets)ws.terminate();wss.close();server.close(async()=>{try{await db.close();resolve()}catch(e){reject(e)}});server.closeIdleConnections()})};
}
if(process.argv[1]&&resolve(process.argv[1])===decodeURIComponent(new URL(import.meta.url).pathname)){
 const app=await startServer();
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}
