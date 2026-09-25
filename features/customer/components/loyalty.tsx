'use client';
import {t} from "@/lib/i18n/react";
import {Gift,Sparkles,PartyPopper} from 'lucide-react';
import {money} from '../../admin/data/demo';
import type {LoyaltySummary} from '../services/loyalty';
function ProgressTrack({remaining}:{remaining:number}){
 const done=Math.max(0,Math.min(5,5-remaining));
 return <ol className="loyalty-stamps" aria-label={t(`${done} commandes livrées sur 5 pour ce palier`)}>{[1,2,3,4,5].map(i=><li key={i} className={"loyalty-stamp"+(i<=done?" is-complete":"")} aria-label={t(`Commande ${i} : ${i<=done?'livrée':'à venir'}`)}>{i<=done?<img src="/images/hadhri-logo-transparent.png" alt=""/>:i===5?<Gift size={26}/>:String(i).padStart(2,'0')}</li>)}</ol>;
}
export function LoyaltyBanner({loyalty}:{loyalty:LoyaltySummary}){
 return <section className="loyalty-pass" aria-label={t("Programme fidélité")}>
  <div className="loyalty-pass-eyebrow"><Sparkles size={15}/>{t("LES PETITES HABITUDES, LES BELLES RÉCOMPENSES")}</div>
  <h2>{t("🎁 Votre fidélité est récompensée")}</h2>
  <p className="loyalty-pass-intro">{t(loyalty.remaining===1?'Encore 1 commande livrée pour gagner':'Encore '+loyalty.remaining+' commandes livrées pour gagner')}</p>
  <div className="loyalty-pass-amount">{t(money(loyalty.nextRewardDt))} <span>{t("sur une prochaine commande")}</span></div>
  <ProgressTrack remaining={loyalty.remaining}/>
  <p className="loyalty-pass-count">{t(`${loyalty.completedOrders} / ${loyalty.nextTarget} commandes livrées`)}</p>
  {loyalty.availableDt>0&&<p className="loyalty-pass-balance"><Sparkles size={16}/>{t(`${money(loyalty.availableDt)} disponibles dans votre panier`)}</p>}
  <div className="loyalty-pass-footer"><span>{t("5 livrées → 5 DT")}</span><span aria-hidden="true"> · </span><span>{t("10 → 10 DT")}</span></div>
 </section>;
}
export function LoyaltyProfileSection({loyalty}:{loyalty:LoyaltySummary}){
 return <section className="loyalty-profile-section hd-card">
  <h2><Gift size={18}/>{t(" Mon programme fidélité")}</h2>
  <p className="loyalty-tagline">{t("Toutes les 5 commandes livrées, gagnez alternativement 5 DT puis 10 DT de remise, sans limite. Les remises non utilisées se cumulent.")}</p>
  <div className="loyalty-progress-row"><span>{t(`${loyalty.completedOrders} / ${loyalty.nextTarget} commandes`)}</span>{t(loyalty.availableDt>0&&<span className="loyalty-chip"><Sparkles size={12}/>{t(money(loyalty.availableDt))}</span>)}</div>
  <ProgressTrack remaining={loyalty.remaining}/>
  <p className="loyalty-next-line">{t(loyalty.availableDt>0?`🎉 Récompense disponible : ${money(loyalty.availableDt)} — utilisez-la dans votre panier.`:loyalty.remaining===1?`Plus qu’une commande avant votre récompense de ${money(loyalty.nextRewardDt)}.`:`Plus que ${loyalty.remaining} commandes avant votre récompense de ${money(loyalty.nextRewardDt)}.`)}</p>
  <div className="loyalty-steps"><span className={loyalty.milestonesReached>=1?"done":""}>{t("5 commandes → 5 DT")}</span><span className={loyalty.milestonesReached>=2?"done":""}>{t("10 commandes → 10 DT")}</span><span className={loyalty.milestonesReached>=3?"done":""}>{t("15 commandes → 5 DT")}</span><span className={loyalty.milestonesReached>=4?"done":""}>{t("20 commandes → 10 DT")}</span></div>
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
