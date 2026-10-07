'use client';
import {useState} from 'react';
import {Star} from 'lucide-react';
import type {Order} from '@/features/admin/data/demo';
import {api,refresh} from '../services/local-store';
export function OrderReview({order}:{order:Order}){
 const [rating,setRating]=useState(0),[comment,setComment]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const [saved,setSaved]=useState<Order['review']>();
 const review=order.review||saved;
 if(order.status!=='DELIVERED')return null;
 if(review)return <section className="order-review" aria-label="Votre avis"><strong>Merci pour votre avis !</strong><p aria-label={`${review.rating} étoiles sur 5`}>{Array.from({length:5},(_,i)=><Star key={i} size={20} aria-hidden="true" fill={i<review.rating?'currentColor':'none'}/>)}</p>{review.comment&&<blockquote>{review.comment}</blockquote>}</section>;
 return <form className="order-review" onSubmit={async e=>{e.preventDefault();if(pending||!rating)return;setPending(true);setError('');try{const result=await api<{review:NonNullable<Order['review']>}>(`/orders/${encodeURIComponent(order.id)}/review`,{method:'POST',body:JSON.stringify({rating,comment})});setSaved(result.review);await refresh()}catch(e){setError((e as Error).message)}finally{setPending(false)}}}>
  <strong>Comment s’est passée votre commande ?</strong><span>Votre avis après livraison nous aide à nous améliorer.</span>
  <fieldset disabled={pending}><legend>Votre note sur 5</legend><div className="review-stars">{[1,2,3,4,5].map(value=><label key={value}><input type="radio" name={`rating-${order.id}`} value={value} checked={rating===value} onChange={()=>setRating(value)} required aria-label={`${value} étoile${value>1?'s':''}`}/><Star size={28} aria-hidden="true" fill={value<=rating?'currentColor':'none'}/></label>)}</div></fieldset>
  <label>Commentaire (facultatif)<textarea rows={3} maxLength={1000} value={comment} disabled={pending} onChange={e=>setComment(e.target.value)} placeholder="Partagez votre expérience…"/></label>
  {error&&<p role="alert" className="checkout-error">{error}</p>}<button className="customer-primary" disabled={pending||!rating}>{pending?'Envoi…':'Envoyer mon avis'}</button>
 </form>;
}
