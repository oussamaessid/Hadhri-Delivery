'use client';
import {requestJson} from '@/lib/api';
const SOUND_KEY='hadhri-admin-order-sound';
// Icône du contenu ; l’icône de l’expéditeur dépend du navigateur et de l’installation de l’application.
export const notificationIcon='/images/hadhri-notification-icon.png';
export function isSoundEnabled(){try{return localStorage.getItem(SOUND_KEY)!=='off'}catch{return true}}
export function setSoundEnabled(on:boolean){try{localStorage.setItem(SOUND_KEY,on?'on':'off')}catch{}}
export function notificationPermission():NotificationPermission|'unsupported'{return typeof Notification==='undefined'?'unsupported':Notification.permission}
export async function requestNotificationPermission(){if(typeof Notification==='undefined')return 'unsupported' as const;const result=await Notification.requestPermission();if(result==='granted')void enablePush();return result}
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
let audio:AudioContext|undefined;
function audioContext(){if(!audio){const Ctx=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;audio=new Ctx()}return audio}
// Les navigateurs bloquent le son tant que la page n’a reçu aucun clic : le premier clic ou la première touche débloque l’audio pour la session.
export function unlockOrderSound(){const unlock=()=>{try{void audioContext().resume()}catch{}};window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true})}
// Sonnerie d’environ deux secondes : trois carillons à deux tons.
export function playOrderSound(){
 try{
  const ctx=audioContext();void ctx.resume();const start=ctx.currentTime+0.05;
  for(let i=0;i<3;i++)for(const [offset,frequency] of [[0,880],[0.18,1320]]){
   const t=start+i*0.6+offset;const osc=ctx.createOscillator();const gain=ctx.createGain();
   osc.type='sine';osc.frequency.value=frequency;
   gain.gain.setValueAtTime(0.0001,t);gain.gain.exponentialRampToValueAtTime(0.5,t+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+0.45);
  }
 }catch{}
}
const keyBytes=(key:string)=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
// Web Push : ce navigateur est abonné côté serveur et reçoit les nouvelles commandes même Admin fermé.
export async function enablePush(){
 const registration=await notificationWorker();
 if(!registration||!('PushManager' in window)||notificationPermission()!=='granted')return false;
 try{
  const {publicKey}=await requestJson<{publicKey:string}>('/api/v1/admin/push');
  const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});
  await requestJson('/api/v1/admin/push',{method:'POST',body:JSON.stringify(subscription)});
  return true;
 }catch{return false}
}
export function notifyNewOrder(order:{id:string;customer:string;merchant:string}){
 if(isSoundEnabled())playOrderSound();
 void showNotification('Nouvelle commande '+order.id,{body:order.customer+' · '+order.merchant,tag:order.id});
}
export function notifyUnreadSummary(count:number){
 if(count<=0)return;
 void showNotification(count+' notification'+(count>1?'s':'')+' non lue'+(count>1?'s':''),{body:'Ouvrez le dashboard Hadhri pour les consulter.',tag:'hadhri-unread-summary'});
}
