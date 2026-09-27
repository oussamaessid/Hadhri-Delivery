'use client';
import {t,useLanguage} from "@/lib/i18n/react";
import {useEffect,useState} from 'react';
import {Gift,Users,ShoppingBag,Wallet,CheckCheck,History,Award} from 'lucide-react';
import {type DemoState,money} from '../data/demo';
import {loyaltyAdminStats,tierRewardDt} from '../../customer/services/loyalty';
import {type AccountEvent,type LoyaltyState} from '../../customer/services/account-history';
import {api} from '../../customer/services/local-store';
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {Avatar} from '../components/common';

type Row={id:string;name:string;completedOrders:number;earnedDt:number;usedDt:number;availableDt:number;updatedAt?:string};
// Étapes 1 à 5 du palier en cours ; au palier atteint, les 5 étapes sont pleines.
function Steps({completed}:{completed:number}){const done=completed>0&&completed%5===0?5:completed%5;return <span className="loyalty-steps" aria-label={t(`Étape ${done}/5`)}>{[1,2,3,4,5].map(i=><i key={i} className={i<=done?'done':''}/>)}<small>{t(`${done}/5`)}</small></span>}
function next(completed:number){const target=completed-(completed%5)+5;return {target,remaining:target-completed,reward:tierRewardDt(target/5)}}

export function LoyaltyAdmin({state}:{state:DemoState}){
 useLanguage();
 const [saved,setSaved]=useState<LoyaltyState[]|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [loaded,setLoaded]=useState<{id:string;events:AccountEvent[];loyalty:LoyaltyState|null;error?:string}|null>(null);
 useEffect(()=>{api<{accounts:LoyaltyState[]}>('/admin/loyalty').then(r=>setSaved(r.accounts)).catch(()=>setSaved([]))},[state.orders]);
 useEffect(()=>{if(!selected)return;api<{events:AccountEvent[];loyalty:LoyaltyState|null}>(`/admin/customers/${encodeURIComponent(selected)}/history`).then(r=>setLoaded({id:selected,...r})).catch(e=>setLoaded({id:selected,events:[],loyalty:null,error:(e as Error).message}))},[selected,state.orders]);
 const history=loaded?.id===selected&&!loaded.error?loaded:null;const error=loaded?.id===selected?loaded.error||'':'';
 const stats=loyaltyAdminStats(state.orders,state.catalog.customers.map(c=>({id:c.id,name:c.name})));
 const savedById=new Map((saved||[]).map(s=>[s.accountId,s]));
 const ids=new Set([...state.catalog.customers.map(c=>c.id),...savedById.keys(),...stats.perCustomer.map(c=>c.id)]);
 // État enregistré par compte en priorité ; à défaut, calcul depuis les commandes.
 const rows:Row[]=[...ids].map(id=>{const s=savedById.get(id);const live=stats.perCustomer.find(c=>c.id===id);const name=state.catalog.customers.find(c=>c.id===id)?.name||live?.name||'Client';if(s)return {id,name,...s};const earned=live?.earnedDt||0;const available=live?.availableDt||0;return {id,name,completedOrders:live?.completedOrders||0,earnedDt:earned,usedDt:Math.max(0,earned-available),availableDt:available}}).sort((a,b)=>b.completedOrders-a.completedOrders||a.name.localeCompare(b.name));
 const cards=[
  {name:'Clients participants',value:rows.filter(r=>r.completedOrders>0).length,note:'Au moins 1 commande livrée',icon:Users,cls:'blue'},
  {name:'Commandes comptabilisées',value:rows.reduce((n,r)=>n+r.completedOrders,0),note:'Statut livré uniquement',icon:ShoppingBag,cls:'violet'},
  {name:'Récompenses 5 DT distribuées',value:stats.rewards5,note:'Paliers 5, 15, 25…',icon:Gift,cls:'orange'},
  {name:'Récompenses 10 DT distribuées',value:stats.rewards10,note:'Paliers 10, 20, 30…',icon:Gift,cls:'green'},
  {name:'Récompenses utilisées',value:money(rows.reduce((n,r)=>n+r.usedDt,0)),note:'Remises appliquées aux commandes',icon:CheckCheck,cls:'green'},
  {name:'Remises encore disponibles',value:money(rows.reduce((n,r)=>n+r.availableDt,0)),note:'En attente d’utilisation',icon:Wallet,cls:'violet'},
 ];
 const row=rows.find(r=>r.id===selected);const current=history?.loyalty?{...row!,...history.loyalty}:row;
 return <><div className="kpis">{t(cards.map(k=><section className="kpi" key={k.name}><div className="kpi-top"><span>{t(k.name)}</span><span className={'icon-tile '+k.cls}><k.icon size={19}/></span></div><strong>{t(k.value)}</strong><small>{t(k.note)}</small></section>))}</div>
 <section className="panel resource-panel"><div className="table-toolbar"><div><h2>{t("Programme fidélité")}</h2><p className="muted">{t("Commandes livrées : 5 → 5 DT · 10 → 10 DT · 15 → 5 DT · 20 → 10 DT, puis le cycle continue. Remises cumulables, commandes annulées exclues.")}</p></div></div>
 <Table><TableHeader><TableRow><TableHead>{t("Client")}</TableHead><TableHead>{t("Commandes livrées")}</TableHead><TableHead>{t("Étape")}</TableHead><TableHead>{t("Prochaine récompense")}</TableHead><TableHead>{t("Gagné / utilisé")}</TableHead><TableHead>{t("Disponible")}</TableHead></TableRow></TableHeader>
 <TableBody>{t(rows.slice(0,200).map(c=>{const n=next(c.completedOrders);const open=()=>setSelected(c.id);return <TableRow key={c.id} className="order-row-clickable" role="button" tabIndex={0} onClick={open} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}}><TableCell><span className="person"><Avatar name={c.name}/><span><b>{t(c.name)}</b><small>{t(c.id.slice(0,8))}</small></span></span></TableCell><TableCell>{t(c.completedOrders)}</TableCell><TableCell><Steps completed={c.completedOrders}/></TableCell><TableCell>{t(`${n.target}ᵉ commande → ${money(n.reward)}`)}<small>{t(n.remaining===1?'Plus qu’une commande':`Plus que ${n.remaining} commandes`)}</small></TableCell><TableCell>{t(`${money(c.earnedDt)} / ${money(c.usedDt)}`)}</TableCell><TableCell>{t(c.availableDt>0?<span className="badge status-DELIVERED">{t(money(c.availableDt))}</span>:<span className="muted">{t("Non")}</span>)}</TableCell></TableRow>}))}</TableBody></Table>
 {t(!rows.length&&<div className="empty-state">{t("Aucun client pour le moment.")}</div>)}
 <div className="pagination"><span>{t(rows.length)}{t(" clients · Cliquez sur un client pour voir son historique fidélité")}</span></div></section>
 <Sheet open={!!selected} onOpenChange={o=>{if(!o)setSelected(null)}}><SheetContent className="order-sheet od-sheet"><SheetHeader className="od-header"><SheetTitle>{t(current?.name||'Client')}</SheetTitle><SheetDescription>{t("État fidélité enregistré et historique du compte")}</SheetDescription></SheetHeader>
 {t(current&&<div className="order-detail od-body">
  <section className="od-card"><h3><Award size={16}/> {t("État fidélité")}</h3><div className="detail-line"><span>{t("Commandes livrées")}</span><b>{t(current.completedOrders)}</b></div><div className="detail-line"><span>{t("Étape en cours")}</span><Steps completed={current.completedOrders}/></div><div className="detail-line"><span>{t("Prochaine récompense")}</span><b>{t(`${next(current.completedOrders).target}ᵉ commande → ${money(next(current.completedOrders).reward)}`)}</b></div><div className="detail-line"><span>{t("Total gagné")}</span><b>{t(money(current.earnedDt))}</b></div><div className="detail-line"><span>{t("Total utilisé")}</span><b>{t(money(current.usedDt))}</b></div><div className="detail-line total"><span>{t("Remise disponible")}</span><b>{t(money(current.availableDt))}</b></div>{t(current.updatedAt&&<p className="muted">{t("Mis à jour le ")}{t(new Date(current.updatedAt).toLocaleString('fr-FR'))}</p>)}</section>
  <section className="od-card"><h3><History size={16}/> {t("Historique du compte")}</h3>{t(error&&<p role="alert" className="form-error">{t(error)}</p>)}{t(!history&&!error&&<p className="muted">{t("Chargement…")}</p>)}{t(history&&!history.events.length&&<p className="muted">{t("Aucun événement enregistré.")}</p>)}<ol className="account-timeline">{t(history?.events.map((e,i)=><li key={i} className={'event-'+e.type}><span><b>{t(e.title)}</b><small>{t(new Date(e.date).toLocaleString('fr-FR'))}</small></span><p>{t(e.detail)}</p></li>))}</ol></section>
 </div>)}</SheetContent></Sheet></>;
}
