import type {DemoState, Order} from '../../admin/data/demo';
import {loyaltySummary} from './loyalty.ts';
import {isOpenNow,scheduleLabel} from '../../admin/data/demo.ts';
import {isTunisianPhone,normalizeTunisianPhone,TUNISIAN_PHONE_ERROR} from './phone.ts';
export type CartLine={productId:string;quantity:number;variantId?:string};
export type CustomerDetails={name:string;phone:string;address:string;notes:string};
export type CheckoutInput={customerAccountId?:string;lines:CartLine[];customer:CustomerDetails;requestId:string;clientSessionId:string;useLoyaltyDiscount?:boolean};
const cents=(n:number)=>Math.round(n*100);
// Livraison = 1ère position (restaurant ou commerce d’un rayon) + chaque position supplémentaire.
export function deliveryFees(settings:DemoState['settings']){
 const firstFee=settings.fee;const extraFee=settings.extraFee??1;
 if(!Number.isFinite(firstFee)||firstFee<0||!Number.isFinite(extraFee)||extraFee<0)throw new Error('Frais de livraison invalides.');
 return {firstFee,extraFee};
}
export function calculateCart(state:DemoState,lines:CartLine[]){
 if(!lines.length)throw new Error('Votre panier est vide.');
 const seen=new Set<string>();const requested=new Map<string,number>();
 const products=lines.map(line=>{const key=line.productId+':'+(line.variantId||'');if(seen.has(key))throw new Error('Produit en double dans le panier.');seen.add(key);requested.set(line.productId,(requested.get(line.productId)||0)+line.quantity);const product=state.catalog.products.find(p=>p.id===line.productId);if(!product||product.status!=='ACTIVE'||(product.categoryId&&state.catalog.categories.find(c=>c.id===product.categoryId)?.status!=='ACTIVE'))throw new Error('Un produit n’est plus disponible. Retirez-le du panier.');if(!Number.isInteger(line.quantity)||line.quantity<1||requested.get(line.productId)!>99)throw new Error(`Quantité trop élevée pour ${product.name}.`);if(!Number.isFinite(product.value)||product.value<0)throw new Error('Prix de produit invalide.');const variant=line.variantId?product.variants?.find(v=>v.id===line.variantId):undefined;if(line.variantId&&!variant)throw new Error("Option non disponible.");return {...line,product:{...product,value:product.value+(variant?.price||0),name:product.name+(variant?" · "+variant.name:"")}};});
 const {firstFee,extraFee}=deliveryFees(state.settings);
 const order:typeof products[number][][]=[];const index=new Map<string,number>();
 for(const p of products){const key=p.product.merchantId||p.product.merchant||p.product.detail;if(!index.has(key)){index.set(key,order.length);order.push([])}order[index.get(key)!].push(p)}
 let paidPositions=0;
 const baskets=order.map(group=>{
  const merchantId=group[0].product.merchantId;const merchant=group[0].product.merchant||group[0].product.detail;
  const commerce=state.catalog.restaurants.find(m=>merchantId?m.id===merchantId:m.name===merchant);
  if(!commerce||commerce.status!=='ACTIVE')throw new Error(`${merchant} n’accepte pas de commandes pour le moment.`);
  if(isOpenNow(commerce)===false)throw new Error(`${merchant} est fermé actuellement (${scheduleLabel(commerce)}).`);
  const subtotalCents=group.reduce((sum,p)=>sum+cents(p.product.value)*p.quantity,0);
  // Livraison gratuite (activée par l’admin) : aucun frais, la position suivante reste la 1ère payante.
  const fee=commerce.freeDelivery?0:paidPositions++===0?firstFee:extraFee;
  return {merchantId:merchantId||merchant,merchant,products:group,subtotal:subtotalCents/100,fee,total:(subtotalCents+cents(fee))/100};
 });
 return {baskets,subtotal:baskets.reduce((s,b)=>s+cents(b.subtotal),0)/100,fee:baskets.reduce((s,b)=>s+cents(b.fee),0)/100,total:baskets.reduce((s,b)=>s+cents(b.total),0)/100};
}
export function createCustomerOrders(state:DemoState,input:CheckoutInput,now=new Date()):{state:DemoState;orders:Order[]}{
 const existing=state.orders.filter(o=>o.requestId===input.requestId||o.requestId?.startsWith(input.requestId+':'));
 if(existing.length){if(existing.some(o=>o.clientSessionId!==input.clientSessionId))throw new Error('Identifiant de commande invalide.');return {state,orders:existing};}
 if(!input.requestId||!input.clientSessionId)throw new Error('Veuillez recharger la page.');
 const name=input.customer.name.trim();const phone=normalizeTunisianPhone(input.customer.phone);const address=input.customer.address.trim();
 if(name.length<2||name.length>100)throw new Error('Indiquez un nom valide.');
 if(!phone)throw new Error('Le numéro de téléphone est obligatoire pour confirmer votre commande.');
 if(!isTunisianPhone(phone))throw new Error(TUNISIAN_PHONE_ERROR);
 if(address.length<10||address.length>300)throw new Error('Précisez une adresse complète (10 à 300 caractères).');
 if(input.customer.notes.length>500)throw new Error('Les instructions doivent rester sous 500 caractères.');
 const cart=calculateCart(state,input.lines);
 const orders:Order[]=[{customerAccountId:input.customerAccountId,id:'CMD-'+input.requestId.toUpperCase(),requestId:input.requestId,clientSessionId:input.clientSessionId,customer:name,phone,merchant:cart.baskets.map(b=>b.merchant).join(' · '),total:cart.total,deliveryFee:cart.fee,status:'PENDING',date:now.toISOString(),driver:'',address,notes:input.customer.notes.trim(),items:cart.baskets.flatMap(basket=>basket.products.map(p=>({productId:p.product.id,merchantId:basket.merchantId,merchant:basket.merchant,name:p.product.name,quantity:p.quantity,price:p.product.value})))}];
 let discountLeft=input.useLoyaltyDiscount&&input.customerAccountId&&state.settings.loyaltyEnabled!==false?Math.min(loyaltySummary(state.orders,input.customerAccountId).availableDt,orders.reduce((sum,o)=>sum+o.total,0)):0;
 const finalOrders=orders.map(o=>{const applied=Number(Math.min(discountLeft,o.total).toFixed(2));discountLeft=Number((discountLeft-applied).toFixed(2));return {...o,loyaltyDiscountDt:applied,total:Number((o.total-applied).toFixed(2))};});
 let customers=state.catalog.customers;
 const existingCustomer=customers.find(c=>input.customerAccountId?c.id===input.customerAccountId:normalizeTunisianPhone(c.phone||'')===phone);
 customers=existingCustomer?customers.map(c=>c.id===existingCustomer.id?{...c,value:c.value+1}:c):[{id:input.customerAccountId||'U-'+input.requestId,name,phone,status:'ACTIVE',detail:address,value:1},...customers];
 const notifications=finalOrders.map(order=>({id:'N-'+order.requestId,orderId:order.id,date:now.toISOString(),title:`Nouvelle commande ${order.id}`,detail:`${name} · ${order.merchant} · Paiement à la livraison`,type:'Commandes',read:false}));
 const next:DemoState={...state,catalog:{...state.catalog,customers,},orders:[...finalOrders,...state.orders],notifications:[...notifications,...state.notifications]};
 return {state:next,orders:finalOrders};
}
