'use client';
const SOUND_KEY='hadhri-admin-order-sound';
export function isSoundEnabled(){try{return localStorage.getItem(SOUND_KEY)!=='off'}catch{return true}}
export function setSoundEnabled(on:boolean){try{localStorage.setItem(SOUND_KEY,on?'on':'off')}catch{}}
export function notificationPermission():NotificationPermission|'unsupported'{return typeof Notification==='undefined'?'unsupported':Notification.permission}
export async function requestNotificationPermission(){if(typeof Notification==='undefined')return 'unsupported' as const;return Notification.requestPermission()}
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
 if(notificationPermission()==='granted'){try{new Notification('Nouvelle commande '+order.id,{body:order.customer+' · '+order.merchant,tag:order.id})}catch{}}
}
export function notifyUnreadSummary(count:number){
 if(count<=0||notificationPermission()!=='granted')return;
 try{new Notification(count+' notification'+(count>1?'s':'')+' non lue'+(count>1?'s':''),{body:'Ouvrez le dashboard Hadhri pour les consulter.',tag:'hadhri-unread-summary'})}catch{}
}
