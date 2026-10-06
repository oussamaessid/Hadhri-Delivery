import type {DemoState, Order} from '../../admin/data/demo';
import {labels} from '../../admin/data/demo.ts';
import {tierRewardDt} from './loyalty.ts';
// Journal par compte : chaque modification du compte et chaque étape fidélité, conservé même si des commandes sont supprimées.
export type AccountEventType='ACCOUNT_CREATED'|'ACCOUNT_UPDATED'|'ORDER_PLACED'|'ORDER_STATUS'|'LOYALTY_PROGRESS'|'LOYALTY_UNLOCKED'|'LOYALTY_USED';
export type AccountEvent={accountId:string;type:AccountEventType;date:string;title:string;detail:string;orderId?:string;amountDt?:number;completedOrders?:number};
export type LoyaltyState={accountId:string;completedOrders:number;earnedDt:number;usedDt:number;availableDt:number;updatedAt:string};
type Customer=DemoState['catalog'][string][number];
const tracked:[keyof Customer,string][]=[['name','Nom'],['phone','Téléphone'],['detail','Adresse'],['status','Statut']];
const dt=(n:number)=>`${n.toFixed(3)} DT`;
const label=(status:string)=>labels[status]||status;

// orderDates : dater les événements de commande avec la date de la commande (reconstitution de l’historique).
export function accountEvents(before:DemoState,after:DemoState,now=new Date(),orderDates=false):AccountEvent[]{
 const events:AccountEvent[]=[];const date=now.toISOString();const at=(o:Order)=>orderDates?o.date:date;
 const oldCustomers=new Map(before.catalog.customers.map(c=>[c.id,c]));
 for(const customer of after.catalog.customers){
  const old=oldCustomers.get(customer.id);
  if(!old){events.push({accountId:customer.id,type:'ACCOUNT_CREATED',date,title:'Compte créé',detail:[customer.name,customer.phone].filter(Boolean).join(' · ')});continue}
  const changes=tracked.filter(([key])=>(old[key]??'')!==(customer[key]??'')).map(([key,name])=>`${name} : ${old[key]||'—'} → ${customer[key]||'—'}`);
  if(changes.length)events.push({accountId:customer.id,type:'ACCOUNT_UPDATED',date,title:'Compte modifié',detail:changes.join(' · ')});
 }
 const oldOrders=new Map(before.orders.map(o=>[o.id,o]));
 const deliveredCount=new Map<string,number>();
 for(const o of new Map(before.orders.map(o=>[o.id,o])).values())if(o.customerAccountId&&o.status==='DELIVERED')deliveredCount.set(o.customerAccountId,(deliveredCount.get(o.customerAccountId)||0)+1);
 for(const order of [...after.orders].sort((a,b)=>a.date.localeCompare(b.date))){
  const accountId=order.customerAccountId;if(!accountId)continue;
  const old=oldOrders.get(order.id);
  if(!old){
   events.push({accountId,orderId:order.id,type:'ORDER_PLACED',date:at(order),title:`Commande ${order.id} passée`,detail:`${order.merchant} · ${dt(order.total)}`,amountDt:order.total});
   if(order.loyaltyDiscountDt)events.push({accountId,orderId:order.id,type:'LOYALTY_USED',date:at(order),amountDt:order.loyaltyDiscountDt,title:`Remise fidélité utilisée : ${dt(order.loyaltyDiscountDt)}`,detail:`Commande ${order.id}`});
  }else if(old.status!==order.status)events.push({accountId,orderId:order.id,type:'ORDER_STATUS',date,title:`Commande ${order.id} : ${label(order.status)}`,detail:`${label(old.status)} → ${label(order.status)}`});
  if(order.status!=='DELIVERED'||old?.status==='DELIVERED')continue;
  const count=(deliveredCount.get(accountId)||0)+1;deliveredCount.set(accountId,count);
  events.push({accountId,orderId:order.id,type:'LOYALTY_PROGRESS',date:at(order),completedOrders:count,title:`${count}ᵉ commande livrée`,detail:`Étape fidélité ${count%5||5}/5 · commande ${order.id}`});
  if(count%5===0){const reward=tierRewardDt(count/5);events.push({accountId,orderId:order.id,type:'LOYALTY_UNLOCKED',date:at(order),completedOrders:count,amountDt:reward,title:`Récompense débloquée : ${dt(reward)}`,detail:`Palier ${count} commandes livrées`})}
 }
 return events;
}
// Reconstitue le journal à partir des comptes et commandes déjà enregistrés.
export function backfillAccountEvents(state:DemoState,now=new Date()):AccountEvent[]{
 return accountEvents({...state,catalog:{...state.catalog,customers:state.catalog.customers},orders:[]},state,now,true);
}
// Applique les événements à l’état fidélité enregistré de chaque compte.
export function applyLoyaltyEvents(states:Map<string,LoyaltyState>,events:AccountEvent[]){
 const millimes=(n:number)=>Math.round(n*1000);
 for(const e of events){
  if(!e.type.startsWith('LOYALTY_'))continue;
  const s=states.get(e.accountId)||{accountId:e.accountId,completedOrders:0,earnedDt:0,usedDt:0,availableDt:0,updatedAt:e.date};
  if(e.type==='LOYALTY_PROGRESS')s.completedOrders=Math.max(s.completedOrders,e.completedOrders||0);
  if(e.type==='LOYALTY_UNLOCKED')s.earnedDt=(millimes(s.earnedDt)+millimes(e.amountDt||0))/1000;
  if(e.type==='LOYALTY_USED')s.usedDt=(millimes(s.usedDt)+millimes(e.amountDt||0))/1000;
  s.availableDt=Math.max(0,(millimes(s.earnedDt)-millimes(s.usedDt))/1000);
  if(e.date>s.updatedAt)s.updatedAt=e.date;
  states.set(e.accountId,s);
 }
 return states;
}
