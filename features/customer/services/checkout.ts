import type {DemoState, Order} from '../../admin/data/demo';
import {loyaltySummary} from './loyalty.ts';
export type CartLine={productId:string;quantity:number;variantId?:string};
export type CustomerDetails={name:string;phone:string;address:string;notes:string};
export type CheckoutInput={customerAccountId?:string;lines:CartLine[];customer:CustomerDetails;requestId:string;clientSessionId:string;useLoyaltyDiscount?:boolean};
const cents=(n:number)=>Math.round(n*100);
export function calculateCart(state:DemoState,lines:CartLine[]){
 if(!lines.length)throw new Error('Votre panier est vide.');
 const seen=new Set<string>();const requested=new Map<string,number>();
 const products=lines.map(line=>{const key=line.productId+':'+(line.variantId||'');if(seen.has(key))throw new Error('Produit en double dans le panier.');seen.add(key);requested.set(line.productId,(requested.get(line.productId)||0)+line.quantity);const product=state.catalog.products.find(p=>p.id===line.productId);if(!product||product.status!=='ACTIVE'||(product.categoryId&&state.catalog.categories.find(c=>c.id===product.categoryId)?.status!=='ACTIVE'))throw new Error('Un produit n’est plus disponible. Retirez-le du panier.');if(!Number.isInteger(line.quantity)||line.quantity<1||requested.get(line.productId)!>(product.stock??0))throw new Error(`Stock insuffisant pour ${product.name}.`);if(!Number.isFinite(product.value)||product.value<0)throw new Error('Prix de produit invalide.');const variant=line.variantId?product.variants?.find(v=>v.id===line.variantId):undefined;if(line.variantId&&!variant)throw new Error("Option non disponible.");return {...line,product:{...product,value:product.value+(variant?.price||0),name:product.name+(variant?" · "+variant.name:"")}};});
 const fee=state.settings.fee;
 if(!Number.isFinite(fee)||fee<0)throw new Error('Frais de livraison invalides.');
 const order:typeof products[number][][]=[];const index=new Map<string,number>();
 for(const p of products){const key=p.product.merchantId||p.product.merchant||p.product.detail;if(!index.has(key)){index.set(key,order.length);order.push([])}order[index.get(key)!].push(p)}
 const baskets=order.map(group=>{
  const merchantId=group[0].product.merchantId;const merchant=group[0].product.merchant||group[0].product.detail;
  const commerce=state.catalog.restaurants.find(m=>merchantId?m.id===merchantId:m.name===merchant);
  if(!commerce||commerce.status!=='ACTIVE')throw new Error(`${merchant} n’accepte pas de commandes pour le moment.`);
  const subtotalCents=group.reduce((sum,p)=>sum+cents(p.product.value)*p.quantity,0);
  return {merchantId:merchantId||merchant,merchant,products:group,subtotal:subtotalCents/100,fee,total:(subtotalCents+cents(fee))/100};
 });
 return {baskets,subtotal:baskets.reduce((s,b)=>s+b.subtotal,0),fee:baskets.reduce((s,b)=>s+b.fee,0),total:baskets.reduce((s,b)=>s+b.total,0)};
}
export function createCustomerOrders(state:DemoState,input:CheckoutInput,now=new Date()):{state:DemoState;orders:Order[]}{
 const existing=state.orders.filter(o=>o.requestId?.startsWith(input.requestId+':'));
 if(existing.length){if(existing.some(o=>o.clientSessionId!==input.clientSessionId))throw new Error('Identifiant de commande invalide.');return {state,orders:existing};}
 if(!input.requestId||!input.clientSessionId)throw new Error('Veuillez recharger la page.');
 const name=input.customer.name.trim();const phone=input.customer.phone.replace(/[\s.-]/g,'');const address=input.customer.address.trim();
 if(name.length<2||name.length>100)throw new Error('Indiquez un nom valide.');
 if(!/^(\+216)?[0-9]{8}$/.test(phone))throw new Error('Indiquez un numéro tunisien à 8 chiffres, avec ou sans +216.');
 if(address.length<10||address.length>300)throw new Error('Précisez une adresse complète (10 à 300 caractères).');
 if(input.customer.notes.length>500)throw new Error('Les instructions doivent rester sous 500 caractères.');
 const cart=calculateCart(state,input.lines);
 const orders:Order[]=cart.baskets.map((basket,i)=>({customerAccountId:input.customerAccountId,id:'CMD-'+input.requestId.toUpperCase()+(cart.baskets.length>1?'-'+(i+1):''),requestId:input.requestId+':'+basket.merchantId,clientSessionId:input.clientSessionId,customer:name,phone,merchant:basket.merchant,total:basket.total,deliveryFee:basket.fee,status:'PENDING',date:now.toISOString(),driver:'',address,notes:input.customer.notes.trim(),items:basket.products.map(p=>({productId:p.product.id,name:p.product.name,quantity:p.quantity,price:p.product.value}))}));
 let discountLeft=input.useLoyaltyDiscount&&input.customerAccountId&&state.settings.loyaltyEnabled!==false?Math.min(loyaltySummary(state.orders,input.customerAccountId).availableDt,orders.reduce((sum,o)=>sum+o.total,0)):0;
 const finalOrders=orders.map(o=>{const applied=Number(Math.min(discountLeft,o.total).toFixed(2));discountLeft=Number((discountLeft-applied).toFixed(2));return {...o,loyaltyDiscountDt:applied,total:Number((o.total-applied).toFixed(2))};});
 const quantities=new Map<string,number>();for(const line of input.lines)quantities.set(line.productId,(quantities.get(line.productId)||0)+line.quantity);
 let customers=state.catalog.customers;
 for(const basket of cart.baskets){const existingCustomer=customers.find(c=>input.customerAccountId?c.id===input.customerAccountId:c.phone?.replace(/[\s.-]/g,'')===phone);customers=existingCustomer?customers.map(c=>c.id===existingCustomer.id?{...c,value:c.value+1}:c):[{id:'U-'+input.requestId+'-'+basket.merchantId,name,phone,status:'ACTIVE',detail:address,value:1},...customers];}
 const notifications=finalOrders.map(order=>({id:'N-'+order.requestId,orderId:order.id,date:now.toISOString(),title:`Nouvelle commande ${order.id}`,detail:`${name} · ${order.merchant} · Paiement à la livraison`,type:'Commandes',read:false}));
 const next:DemoState={...state,catalog:{...state.catalog,customers,products:state.catalog.products.map(p=>quantities.has(p.id)?{...p,stock:(p.stock??0)-quantities.get(p.id)!}:p)},orders:[...finalOrders,...state.orders],notifications:[...notifications,...state.notifications]};
 return {state:next,orders:finalOrders};
}
