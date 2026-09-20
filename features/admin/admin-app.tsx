'use client';
import {t,useLanguage} from "@/lib/i18n/react";

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,ShoppingBag,UtensilsCrossed,LayoutGrid,Package,Shapes,Users,Bike,Truck,Gift,ChartNoAxesCombined,Bell,Settings,ArrowDownToLine,ChevronRight} from 'lucide-react';
import {Sidebar,SidebarProvider,SidebarContent,SidebarHeader,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,SidebarTrigger,useSidebar} from '@/components/ui/sidebar';
import {ApiStatus} from '../customer/api-status';
import {api} from '../customer/services/local-store';
import {useDemoStore} from '../customer/services/local-store';
import {metrics} from './services/metrics';
import {useOrderStream,type IncomingOrder} from './services/order-stream';
import {notifyUnreadSummary} from './services/order-alerts';
import {OrderAlert} from './components/order-alert';
import {Choice,Avatar} from './components/common';
import {Dashboard} from './pages/dashboard';
import {Resources} from './pages/resources';
import {Orders} from './pages/orders';
import {Statistics} from './pages/statistics';
import {LoyaltyAdmin} from './pages/loyalty';
import {Notifications,Settings as SettingsPage} from './pages/preferences';
export const navigation=[{id:'dashboard',label:'Tableau de bord',icon:LayoutDashboard},{id:'orders',label:'Commandes',icon:ShoppingBag},{id:'restaurants',label:'Restaurants',icon:UtensilsCrossed},{id:'departments',label:'Rayons accueil',icon:LayoutGrid},{id:'products',label:'Produits',icon:Package},{id:'categories',label:'Catégories',icon:Shapes},{id:'customers',label:'Clients',icon:Users},{id:'drivers',label:'Livreurs',icon:Bike},{id:'deliveries',label:'Livraisons',icon:Truck},{id:'loyalty',label:'Programme fidélité',icon:Gift},{id:'statistics',label:'Statistiques',icon:ChartNoAxesCombined},{id:'notifications',label:'Notifications',icon:Bell},{id:'settings',label:'Paramètres',icon:Settings}];
function Navigation({page,go,unread}:{page:string;go:(p:string)=>void;unread:number}){
 useLanguage();
const {setOpenMobile}=useSidebar();return <Sidebar side="left" className="admin-sidebar"><SidebarHeader><Link href="#dashboard" className="brand" aria-label={t("Hadhri Delivery")}><img src="/images/hadhri-logo-transparent.png" alt={t("Hadhri Delivery")}/></Link><span className="workspace-label">{t("ESPACE ADMINISTRATEUR")}</span></SidebarHeader><SidebarContent className="admin-menu-scroll"><SidebarMenu>{t(navigation.map((n,i)=><SidebarMenuItem key={n.id} className={i===10?'nav-break':''}><SidebarMenuButton isActive={page===n.id} onClick={()=>{go(n.id);setOpenMobile(false)}}><n.icon/><span>{t(n.label)}</span>{t(n.id==='notifications'&&unread>0&&<b className="nav-count">{t(unread)}</b>)}</SidebarMenuButton></SidebarMenuItem>))}</SidebarMenu></SidebarContent><SidebarFooter><button className="profile" onClick={()=>go('settings')}><Avatar name="Admin Hadhri"/><span><b>{t("Admin Hadhri")}</b><small>{t("Administrateur")}</small></span><ChevronRight size={16}/></button></SidebarFooter></Sidebar>}
export default function AdminApp(){
 useLanguage();
const [state,setState]=useDemoStore();const [page,setPage]=useState('dashboard');const [days,setDays]=useState('30');const [message,setMessage]=useState('');const [selected,setSelected]=useState<string|null>(null);const [orderAlert,setOrderAlert]=useState<IncomingOrder|null>(null);
useEffect(()=>{const sync=()=>{const p=location.hash.slice(1);setPage(navigation.some(n=>n.id===p)?p:'dashboard')};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
useEffect(()=>{const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;if(!context)return;const lifecycle=new AbortController();try{Promise.resolve(context.registerTool({name:'read_admin_metrics',description:'Read the current local demonstration dashboard metrics.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {mode:'demo',...metrics(state)};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}return()=>lifecycle.abort()},[state]);
useOrderStream(order=>setOrderAlert(order));
useEffect(()=>{if(!orderAlert)return;const timer=setTimeout(()=>setOrderAlert(null),8000);return()=>clearTimeout(timer)},[orderAlert]);
const summarized=useRef(false);
useEffect(()=>{
 if(summarized.current||!state.notifications.length)return;
 summarized.current=true;
 const unread=state.notifications.filter(n=>!n.read).length;
 if(unread>0)queueMicrotask(()=>{setMessage(unread+' notification'+(unread>1?'s':'')+' non lue'+(unread>1?'s':'')+'.');notifyUnreadSummary(unread)});
},[state.notifications]);
const go=(p:string)=>{location.hash=p;setPage(p)};
const exportReport=()=>{const csv='Commande;Client;Commerce;Montant DT;Statut\n'+state.orders.map(o=>[o.id,o.customer,o.merchant,o.total,o.status].map(v=>'"'+(/^[\s]*[=+@\-]/.test(String(v))?"'"+String(v):String(v)).replaceAll('"','""')+'"').join(';')).join('\n');const url=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wasla-commandes.csv';a.click();URL.revokeObjectURL(url);setMessage('Rapport exporté.');};
return <SidebarProvider><OrderAlert order={orderAlert} onClose={()=>setOrderAlert(null)} onOpen={()=>{if(orderAlert){setSelected(orderAlert.id);go('orders')}setOrderAlert(null)}}/><Navigation page={page} go={go} unread={state.notifications.filter(n=>!n.read).length}/><div className="main-shell"><header className="topbar"><div className="breadcrumb"><SidebarTrigger/><span>{t("Espace de travail")}</span><ChevronRight size={14}/><b>{t(navigation.find(n=>n.id===page)?.label)}</b></div><div className="topbar-right"><button className="outline-button" onClick={async()=>{await api('/auth/logout',{method:'POST'});location.reload()}}>{t("Déconnexion")}</button><button className="icon-button" aria-label={t("Notifications")} onClick={()=>go('notifications')}><Bell size={20}/>{t(state.notifications.some(n=>!n.read)&&<i/>)}</button><Avatar name="Admin Hadhri"/></div></header><ApiStatus/><main className="main-content"><div className="page-heading"><div><div className="eyebrow">{t("VOTRE PLATEFORME, EN UN COUP D’ŒIL")}</div><h1>{t(page==='dashboard'?'Vue d’ensemble':navigation.find(n=>n.id===page)?.label)}</h1><p>{t(page==='dashboard'?'Bonjour ! Voici ce qui se passe sur Hadhri Delivery aujourd’hui.':'Gérez votre activité depuis un seul espace.')}</p></div><div className="heading-actions">{t(['dashboard','statistics'].includes(page)&&<Choice label={t("Période")} value={days} onChange={setDays} options={[{value:'7',label:'7 derniers jours'},{value:'30',label:'30 derniers jours'},{value:'90',label:'3 derniers mois'}]}/>)}<button className="primary-button" onClick={exportReport}><ArrowDownToLine size={17}/>{t(" Exporter commandes")}</button></div></div><div className="date-note">{t("Catalogue et commandes synchronisés avec la base locale")}</div>{t(message&&<div className="toast" role="status" onClick={()=>setMessage('')}>{t(message)}</div>)}{t(page==='dashboard'?<Dashboard state={state} days={Number(days)} go={go} openOrder={id=>{setSelected(id);go('orders')}}/>:page==='orders'||page==='deliveries'?<Orders key={page} state={state} update={setState} notify={setMessage} delivery={page==='deliveries'} selected={selected} setSelected={setSelected}/>:page==='statistics'?<Statistics state={state} days={Number(days)}/>:page==='loyalty'?<LoyaltyAdmin state={state}/>:page==='notifications'?<Notifications state={state} update={setState} openOrder={id=>{setSelected(id);go('orders')}}/>:page==='settings'?<SettingsPage state={state} update={setState} notify={setMessage}/>:<Resources key={page} resource={page} state={state} update={setState} notify={setMessage}/>)}<footer className="page-footer"><span>{t("Hadhri Admin © 2026")}</span><span>{t("Votre commerce. Toujours en mouvement.")}</span></footer></main></div></SidebarProvider>
}
