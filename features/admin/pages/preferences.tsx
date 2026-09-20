'use client';
import {t,useLanguage} from "@/lib/i18n/react";

import {useState} from 'react';
import {Bell,CheckCheck,ShoppingBag,ShieldCheck,Volume2,VolumeX,Info,ArrowUpRight,Gift} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {type DemoState} from '../data/demo';
import {isSoundEnabled,setSoundEnabled,notificationPermission,requestNotificationPermission} from '../services/order-alerts';
export function Notifications({state,update,openOrder}:{state:DemoState;update:(s:DemoState)=>void;openOrder?:(id:string)=>void}){
 useLanguage();
 const unreadCount=state.notifications.filter(n=>!n.read).length;
 const resolveOrderId=(n:{orderId?:string;title:string;detail:string})=>{
  const text=`${n.orderId||''} ${n.title||''} ${n.detail||''}`;
  const match=text.match(/CMD-[A-Za-z0-9-]+/);
  const candidate=n.orderId||match?.[0];
  if(candidate&&state.orders.some(o=>o.id===candidate))return candidate;
  return null;
 };
return <><section className="panel"><div className="panel-heading"><div><h2>{t("Centre de notifications")}</h2><p>{t(unreadCount)}{t(" non lues sur ")}{t(state.notifications.length)}{t(" au total")}</p></div><button className="outline-button" disabled={state.notifications.every(n=>n.read)} onClick={()=>void Promise.resolve(update({...state,notifications:state.notifications.map(n=>({...n,read:true}))})).catch(()=>{})}><CheckCheck size={16}/>{t(" Tout marquer comme lu")}</button></div>{t(state.notifications.map(n=>{
 const markRead=()=>{if(n.read)return Promise.resolve();return Promise.resolve(update({...state,notifications:state.notifications.map(x=>x.id===n.id?{...x,read:true}:x)})).catch(()=>{});};
 const orderId=resolveOrderId(n);
 const canOpen=Boolean(orderId&&openOrder);
 // Toute la carte est cliquable : ouvre le détail commande si liée, marque toujours comme lue (auto lu).
 const openThis=()=>{void markRead();if(orderId&&openOrder)openOrder(orderId);};
 return <div className={'notification-row clickable'+(!n.read?' unread':'')} key={n.id} role="button" tabIndex={0} aria-label={t(canOpen?`Ouvrir la commande ${orderId}`:`Marquer comme lue : ${n.title}`)} onClick={openThis} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openThis()}}}><span className="icon-tile violet"><Bell size={19}/></span><div><span className="notification-type">{t(n.type)}</span><h2>{t(n.title)}</h2><p>{t(n.detail)}</p>{canOpen&&<span className="notification-order-link"><ArrowUpRight size={13}/>{t("Voir la commande")}{t(orderId?` ${orderId}`:'')}</span>}</div><button className="text-button" disabled={n.read} onClick={e=>{e.stopPropagation();void markRead()}}>{t(n.read?'Lu':'Marquer comme lu')}</button></div>;
}))}</section></>}
export function Settings({state,update,notify}:{state:DemoState;update:(s:DemoState)=>void;notify:(s:string)=>void}){
 useLanguage();
 const [sound,setSound]=useState(isSoundEnabled);const [permission,setPermission]=useState(notificationPermission);
 const [showHelp,setShowHelp]=useState(false);const [testSent,setTestSent]=useState(false);
 const [loyaltyEnabled,setLoyaltyEnabled]=useState(state.settings.loyaltyEnabled!==false);
 const onPermissionClick=async()=>{
  if(permission==='default'){setPermission(await requestNotificationPermission());return}
  if(permission==='granted'){try{new Notification('Notification test Hadhri',{body:'Si vous voyez ceci, tout fonctionne.'})}catch{}setTestSent(true);return}
  setShowHelp(v=>!v);
 };
return <div className="settings-grid"><section className="panel"><h2>{t("Informations de la plateforme")}</h2><p className="muted settings-note">{t("Réglages partagés par le site client et l’Admin")}</p><form className="entity-form" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);try{await update({...state,settings:{name:String(data.get('name')).trim(),email:String(data.get('email')),fee:Number(data.get('fee')),loyaltyEnabled}});notify('Paramètres enregistrés.')}catch(e){notify((e as Error).message)}}}><label>{t("Nom de la plateforme")}<input name="name" defaultValue={state.settings.name} required minLength={2}/></label><label>{t("Email de contact")}<input name="email" type="email" defaultValue={state.settings.email} required/></label><label>{t("Frais de livraison par défaut (DT)")}<input name="fee" type="number" min="0" max="100" step="0.1" defaultValue={state.settings.fee} required/></label><p className="muted">{t("Ce tarif s’appliquera aux futures commandes. Les commandes de démonstration existantes conservent leurs frais.")}</p><label className="switch-row loyalty-toggle-row"><span><Gift size={16}/>{t(" Programme fidélité client")}</span><Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled}/></label><p className="muted">{t("Récompense automatique de 5 DT à la 5ᵉ commande livrée, puis 10 DT à la 10ᵉ, et ainsi de suite. Désactivez pour suspendre les nouvelles récompenses.")}</p><button className="primary-button" type="submit">{t("Enregistrer les paramètres")}</button></form></section><div><section className="panel"><div className="panel-heading"><h2>{t("Alertes de commandes en temps réel")}</h2>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</div><div className="notification-alert-settings"><label className="switch-row"><span>{t("Jouer un son pour les nouvelles commandes")}</span><Switch checked={sound} onCheckedChange={v=>{setSound(v);setSoundEnabled(v)}}/></label>{permission==='granted'?<div className="setting-status"><b>{t("Notifications du navigateur")}</b><span className="badge status-ACTIVE">{t("Activées")}</span></div>:<button className="outline-button" disabled={permission==='unsupported'} onClick={onPermissionClick}>{t(permission==='denied'?'Comment débloquer les notifications ?':permission==='unsupported'?'Notifications non prises en charge':'Activer les notifications du navigateur')}</button>}{permission==='granted'&&<button className="text-button" onClick={onPermissionClick}>{t("Envoyer une notification test")}</button>}{t(testSent&&<p className="muted">{t("Notification test envoyée. Si rien n’apparaît à l’écran, le blocage vient de Chrome ou de macOS (voir ci-dessous).")}</p>)}{t(showHelp&&<div className="help-box"><Info size={16}/><div><p><b>{t("Chrome")}</b>{t(" : cliquez sur l’icône 🔒 à gauche de l’adresse du site → Notifications → Autoriser, puis rechargez la page.")}</p><p><b>{t("macOS")}</b>{t(" : Réglages Système → Notifications → Google Chrome → activez « Autoriser les notifications ».")}</p></div></div>)}</div></section><section className="panel"><div className="panel-heading"><h2>{t("Paiements")}</h2><ShoppingBag size={18}/></div><div className="setting-status"><b>{t("Espèces à la livraison")}</b><span className="badge status-ACTIVE">{t("Activé")}</span></div><p className="muted">{t("Aucune carte bancaire n’est nécessaire. Les paiements en ligne ne sont pas activés dans cette version.")}</p></section><section className="panel settings-note"><div className="panel-heading"><h2>{t("Environnement")}</h2><ShieldCheck size={18}/></div><p className="settings-note muted">{t("Catalogue de test avec stockage persistant. L’espace Admin est protégé par mot de passe. Les commandes clients sont liées à leur session.")}</p></section></div></div>}
