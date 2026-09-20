'use client';
import {t} from "@/lib/i18n/react";
import {Gift,Sparkles,PartyPopper} from 'lucide-react';
import {money} from '../../admin/data/demo';
import type {LoyaltySummary} from '../services/loyalty';
function ProgressTrack({remaining}:{remaining:number}){
 const done=5-remaining;
 const pct=Math.max(6,Math.round((done/5)*100));
 return <div className="loyalty-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={done} aria-label="Progression fidélité"><div className="loyalty-progress-fill" style={{width:pct+'%'}}/>{[1,2,3,4,5].map(i=><span key={i} className={"loyalty-dot"+(i<=done?" done":"")}/> )}</div>;
}
export function LoyaltyBanner({loyalty}:{loyalty:LoyaltySummary}){
 return <section className="loyalty-banner hd-card" aria-label={t("Programme fidélité")}>
  <span className="loyalty-banner-icon"><Gift size={22}/></span>
  <div className="loyalty-banner-body">
   <strong>{t("🎁 Votre fidélité est récompensée")}</strong>
   {t(loyalty.availableDt>0
    ?<p className="loyalty-reward-line"><Sparkles size={14}/>{t(`Récompense disponible : ${money(loyalty.availableDt)} — utilisez-la dans votre panier.`)}</p>
    :<><ProgressTrack remaining={loyalty.remaining}/><p>{t(loyalty.remaining===1?`Encore 1 commande pour gagner ${money(loyalty.nextRewardDt)}`:`Encore ${loyalty.remaining} commandes pour gagner ${money(loyalty.nextRewardDt)}`)}</p><small className="loyalty-hint">{t(`${loyalty.completedOrders} / ${loyalty.nextTarget} commandes · 5 commandes → 5 DT · 10 commandes → 10 DT`)}</small></>)}
  </div>
 </section>;
}
export function LoyaltyProfileSection({loyalty}:{loyalty:LoyaltySummary}){
 return <section className="loyalty-profile-section hd-card">
  <h2><Gift size={18}/>{t(" Mon programme fidélité")}</h2>
  <p className="loyalty-tagline">{t("Commandez régulièrement et profitez de récompenses.")}</p>
  <div className="loyalty-progress-row"><span>{t(`${loyalty.completedOrders} / ${loyalty.nextTarget} commandes`)}</span>{t(loyalty.availableDt>0&&<span className="loyalty-chip"><Sparkles size={12}/>{t(money(loyalty.availableDt))}</span>)}</div>
  <ProgressTrack remaining={loyalty.remaining}/>
  <p className="loyalty-next-line">{t(loyalty.availableDt>0?`🎉 Récompense disponible : ${money(loyalty.availableDt)} — utilisez-la dans votre panier.`:loyalty.remaining===1?`Plus qu’une commande avant votre récompense de ${money(loyalty.nextRewardDt)}.`:`Plus que ${loyalty.remaining} commandes avant votre récompense de ${money(loyalty.nextRewardDt)}.`)}</p>
  <div className="loyalty-steps"><span className={loyalty.milestonesReached>=1?"done":""}>{t("5 commandes → 5 DT")}</span><span className={loyalty.milestonesReached>=2?"done":""}>{t("10 commandes → 10 DT")}</span></div>
  {t(loyalty.history.length>0&&<div className="loyalty-history"><small>{t("Historique fidélité")}</small>{t(loyalty.history.slice().reverse().map(h=><div key={h.tier} className="loyalty-history-row"><span>{t(`${h.orderCount}ᵉ commande livrée`)}</span><b>{t(money(h.rewardDt))}</b><span className={"loyalty-tag "+(h.fullyRedeemed?"used":h.usedDt>0?"partial":"open")}>{t(h.fullyRedeemed?'Utilisée':h.usedDt>0?'Partiellement utilisée':'Disponible')}</span></div>))}</div>)}
 </section>;
}
export function LoyaltyCartOffer({availableDt,applied,onToggle}:{availableDt:number;applied:boolean;onToggle:(next:boolean)=>void}){
 if(availableDt<=0)return null;
 return <div className="loyalty-cart-offer hd-card"><span className="loyalty-banner-icon small"><Gift size={18}/></span><div><strong>{t(`🎁 Remise fidélité : vous disposez de ${money(availableDt)}`)}</strong><p>{t("Profitez-en dès maintenant sur cette commande.")}</p></div><button type="button" className={applied?"customer-secondary loyalty-offer-button active":"customer-primary loyalty-offer-button"} onClick={()=>onToggle(!applied)}>{t(applied?`Remise appliquée : -${money(availableDt)}`:`Utiliser ma remise`)}</button></div>;
}
export function LoyaltyCelebration({rewardDt,onClose}:{rewardDt:number;onClose:()=>void}){
 return <div className="loyalty-celebration" role="status"><span className="loyalty-celebration-icon"><PartyPopper size={24}/></span><div><strong>{t("Félicitations !")}</strong><p>{t(`Vous venez de gagner ${money(rewardDt)} de remise sur votre prochaine commande.`)}</p></div><button type="button" aria-label={t("Fermer")} className="loyalty-celebration-close" onClick={onClose}>{t("×")}</button></div>;
}
