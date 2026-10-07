import {z} from 'zod';
const schema=z.object({rating:z.number().int().min(1).max(5),comment:z.string().trim().max(1000).default('')}).strict();
const fail=(message,status)=>{throw Object.assign(new Error(message),{status})};
export function addOrderReview(state,orderId,customerId,input){
 if(!customerId)fail('Connectez-vous pour donner votre avis.',401);
 const order=state.orders.find(o=>o.id===orderId&&o.customerAccountId===customerId);
 if(!order)fail('Commande introuvable.',404);
 if(order.status!=='DELIVERED')fail('Vous pourrez donner votre avis après la livraison.',409);
 if(order.review)fail('Vous avez déjà donné votre avis sur cette commande.',409);
 const review={...schema.parse(input),createdAt:new Date().toISOString()};
 order.review=review;
 return review;
}
