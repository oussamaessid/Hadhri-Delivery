'use client';
import {t} from "@/lib/i18n/react";
import {X,ShoppingBag,ArrowUpRight} from 'lucide-react';
import {money} from '../data/demo';
import {type IncomingOrder} from '../services/order-stream';
export function OrderAlert({order,onClose,onOpen}:{order:IncomingOrder|null;onClose:()=>void;onOpen:()=>void}){
 if(!order)return null;
 const itemCount=order.items.reduce((sum,item)=>sum+item.quantity,0);
return <div className="order-alert-backdrop" onClick={onClose}><div className="order-alert" onClick={e=>e.stopPropagation()}><button className="order-alert-close" aria-label={t("Fermer")} onClick={onClose}><X size={16}/></button><span className="order-alert-icon"><ShoppingBag size={22}/></span><span className="order-alert-eyebrow">{t("Nouvelle commande")}</span><h2>{t(order.customer)}</h2><p className="muted">{t(order.merchant)}</p><div className="order-alert-meta"><span>{t(order.id)}</span><b>{t(money(order.total))}</b></div><p className="muted order-alert-items">{t(itemCount)}{t(itemCount>1?' articles':' article')}</p><button className="primary-button full" onClick={onOpen}><ArrowUpRight size={16}/>{t(" Voir la commande")}</button></div></div>}
