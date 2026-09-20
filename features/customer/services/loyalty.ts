import type {Order} from '../../admin/data/demo';
// Chaque tranche de 5 commandes livrées débloque une récompense : 5 DT aux paliers impairs (5e, 15e…), 10 DT aux paliers pairs (10e, 20e…), sans limite.
export const tierRewardDt=(tier:number)=>tier%2===1?5:10;
export type LoyaltyHistoryEntry={tier:number;orderCount:number;rewardDt:number;usedDt:number;fullyRedeemed:boolean};
export type LoyaltySummary={completedOrders:number;availableDt:number;nextTarget:number;remaining:number;nextRewardDt:number;milestonesReached:number;justUnlocked:boolean;history:LoyaltyHistoryEntry[]};
export function loyaltySummary(orders:Order[],customerAccountId:string|undefined|null):LoyaltySummary{
 const seen=new Set<string>();
 const mine=(customerAccountId?orders.filter(o=>o.customerAccountId===customerAccountId):[]).filter(o=>{if(seen.has(o.id))return false;seen.add(o.id);return true});
 const completedOrders=mine.filter(o=>o.status==='DELIVERED').length;
 const milestonesReached=Math.floor(completedOrders/5);
 const redeemedTotal=mine.reduce((sum,o)=>sum+(o.loyaltyDiscountDt||0),0);
 let bank=redeemedTotal;
 const history:LoyaltyHistoryEntry[]=Array.from({length:milestonesReached},(_,i)=>{
  const tier=i+1;const rewardDt=tierRewardDt(tier);const usedDt=Math.min(bank,rewardDt);bank-=usedDt;
  return {tier,orderCount:tier*5,rewardDt,usedDt,fullyRedeemed:usedDt===rewardDt};
 });
 const earned=history.reduce((sum,h)=>sum+h.rewardDt,0);
 const availableDt=Math.max(0,Number((earned-redeemedTotal).toFixed(2)));
 const nextTarget=completedOrders-(completedOrders%5)+5;
 const remaining=nextTarget-completedOrders;
 const nextRewardDt=tierRewardDt(nextTarget/5);
 return {completedOrders,availableDt,nextTarget,remaining,nextRewardDt,milestonesReached,justUnlocked:completedOrders>0&&completedOrders%5===0,history};
}
export type LoyaltyAdminStats={participants:number;countedOrders:number;rewards5:number;rewards10:number;usedRewards:number;availableRewards:number;perCustomer:{id:string;name:string;completedOrders:number;nextTarget:number;remaining:number;nextRewardDt:number;availableDt:number}[]};
export function loyaltyAdminStats(orders:Order[],customers:{id:string;name:string}[]):LoyaltyAdminStats{
 const ids=new Set<string>();
 for(const o of orders)if(o.customerAccountId)ids.add(o.customerAccountId);
 for(const c of customers)ids.add(c.id);
 const perCustomer=[...ids].map(id=>{
  const summary=loyaltySummary(orders,id);
  const customer=customers.find(c=>c.id===id);
  return {id,name:customer?.name||'Client',completedOrders:summary.completedOrders,nextTarget:summary.nextTarget,remaining:summary.remaining,nextRewardDt:summary.nextRewardDt,availableDt:summary.availableDt,milestones:summary.milestonesReached,history:summary.history};
 });
 const rewards5=perCustomer.reduce((s,c)=>s+c.history.filter(h=>h.rewardDt===5).length,0);
 const rewards10=perCustomer.reduce((s,c)=>s+c.history.filter(h=>h.rewardDt===10).length,0);
 const usedRewards=orders.reduce((s,o)=>s+((o.loyaltyDiscountDt||0)>0?1:0),0);
 // Nombre de récompenses utilisées = commandes avec remise ; montant disponible = somme restante
 const availableRewards=perCustomer.reduce((s,c)=>s+c.availableDt,0);
 const countedOrders=orders.filter(o=>o.status==='DELIVERED').length;
 return {participants:perCustomer.filter(c=>c.completedOrders>0).length,countedOrders,rewards5,rewards10,usedRewards,availableRewards,perCustomer:perCustomer.sort((a,b)=>b.completedOrders-a.completedOrders) as LoyaltyAdminStats['perCustomer']};
}
