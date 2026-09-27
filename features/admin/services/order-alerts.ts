'use client';
const SOUND_KEY='hadhri-admin-order-sound';
// Icône du contenu ; l’icône de l’expéditeur dépend du navigateur et de l’installation de l’application.
export const notificationIcon='/images/hadhri-notification-icon.png';
export function isSoundEnabled(){try{return localStorage.getItem(SOUND_KEY)!=='off'}catch{return true}}
export function setSoundEnabled(on:boolean){try{localStorage.setItem(SOUND_KEY,on?'on':'off')}catch{}}
export function notificationPermission():NotificationPermission|'unsupported'{return typeof Notification==='undefined'?'unsupported':Notification.permission}
export async function requestNotificationPermission(){if(typeof Notification==='undefined')return 'unsupported' as const;const result=await Notification.requestPermission();if(result==='granted')void notificationWorker();return result}
// Notifications exigent HTTPS : en http:// (ex. accès par adresse IP) le navigateur les désactive.
export const notificationsNeedHttps=()=>typeof window!=='undefined'&&!window.isSecureContext;
let worker:Promise<ServiceWorkerRegistration|undefined>|undefined;
export function notificationWorker(){
 if(!worker)worker=typeof navigator!=='undefined'&&'serviceWorker' in navigator&&window.isSecureContext?navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).catch(()=>undefined):Promise.resolve(undefined);
 return worker;
}
// Via le service worker d’abord (seule méthode acceptée sur Android), sinon l’API classique du navigateur.
export async function showNotification(title:string,options:NotificationOptions={}){
 if(notificationPermission()!=='granted')return false;
 const full={icon:notificationIcon,badge:notificationIcon,data:{url:'/admin'},...options};
 const registration=await notificationWorker();
 if(registration){try{await registration.showNotification(title,full);return true}catch{}}
 try{new Notification(title,full);return true}catch{return false}
}
function beep(){
 try{
  const Ctx=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  const ctx=new Ctx();const osc=ctx.createOscillator();const gain=ctx.createGain();
  osc.type='sine';osc.frequency.value=880;
  gain.gain.setValueAtTime(0.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3,ctx.currentTime+0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35);
  osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.4);
  osc.onended=()=>ctx.close();
 }catch{}
}
export function notifyNewOrder(order:{id:string;customer:string;merchant:string}){
 if(isSoundEnabled())beep();
 void showNotification('Nouvelle commande '+order.id,{body:order.customer+' · '+order.merchant,tag:order.id});
}
export function notifyUnreadSummary(count:number){
 if(count<=0)return;
 void showNotification(count+' notification'+(count>1?'s':'')+' non lue'+(count>1?'s':''),{body:'Ouvrez le dashboard Hadhri pour les consulter.',tag:'hadhri-unread-summary'});
}
