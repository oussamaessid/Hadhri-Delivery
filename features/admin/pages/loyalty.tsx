'use client';
import {t,useLanguage} from "@/lib/i18n/react";
import {Gift,Users,ShoppingBag,Wallet,CheckCheck} from 'lucide-react';
import {type DemoState,money} from '../data/demo';
import {loyaltyAdminStats} from '../../customer/services/loyalty';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {Avatar} from '../components/common';

export function LoyaltyAdmin({state}:{state:DemoState}){
 useLanguage();
 const stats=loyaltyAdminStats(state.orders,state.catalog.customers.map(c=>({id:c.id,name:c.name})));
 const cards=[
  {name:'Clients participants',value:stats.participants,note:'Au moins 1 commande livrée',icon:Users,cls:'blue'},
  {name:'Commandes comptabilisées',value:stats.countedOrders,note:'Statut livré uniquement',icon:ShoppingBag,cls:'violet'},
  {name:'Récompenses 5 DT distribuées',value:stats.rewards5,note:'Paliers 5, 15, 25…',icon:Gift,cls:'orange'},
  {name:'Récompenses 10 DT distribuées',value:stats.rewards10,note:'Paliers 10, 20, 30…',icon:Gift,cls:'green'},
  {name:'Récompenses utilisées',value:stats.usedRewards,note:'Commandes avec remise',icon:CheckCheck,cls:'green'},
  {name:'Remises encore disponibles',value:money(stats.availableRewards),note:'En attente d’utilisation',icon:Wallet,cls:'violet'},
 ];
 return <><div className="kpis">{t(cards.map(k=><section className="kpi" key={k.name}><div className="kpi-top"><span>{t(k.name)}</span><span className={'icon-tile '+k.cls}><k.icon size={19}/></span></div><strong>{t(k.value)}</strong><small>{t(k.note)}</small></section>))}</div>
 <section className="panel resource-panel"><div className="table-toolbar"><div><h2>{t("Programme fidélité")}</h2><p className="muted">{t("5ᵉ commande livrée → 5 DT · 10ᵉ commande livrée → 10 DT · Commandes annulées exclues · Une seule logique partagée.")}</p></div></div>
 <Table><TableHeader><TableRow><TableHead>{t("Client")}</TableHead><TableHead>{t("Commandes terminées")}</TableHead><TableHead>{t("Prochaine récompense")}</TableHead><TableHead>{t("Récompense disponible")}</TableHead></TableRow></TableHeader>
 <TableBody>{t(stats.perCustomer.slice(0,50).map(c=><TableRow key={c.id}><TableCell><span className="person"><Avatar name={c.name}/><span><b>{t(c.name)}</b><small>{t(c.id.slice(0,8))}</small></span></span></TableCell><TableCell>{t(c.completedOrders)}</TableCell><TableCell>{t(c.remaining===5&&c.completedOrders>0?`Palier ${c.nextTarget} → ${money(c.nextRewardDt)}`:`${c.nextTarget}ᵉ commande → ${money(c.nextRewardDt)}`)}{t(<small>{t(c.remaining===1?'Plus qu’une commande':`Plus que ${c.remaining} commandes`)}</small>)}</TableCell><TableCell>{t(c.availableDt>0?<span className="badge status-DELIVERED">{t(money(c.availableDt))}</span>:<span className="muted">{t("Non")}</span>)}</TableCell></TableRow>))}</TableBody></Table>
 {t(!stats.perCustomer.length&&<div className="empty-state">{t("Aucun client pour le moment.")}</div>)}
 <div className="pagination"><span>{t(stats.perCustomer.length)}{t(" clients · Règles identiques sur le site, l’application et le back-office")}</span></div></section></>;
}
