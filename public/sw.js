// Service worker Hadhri : affiche les notifications de commande (obligatoire sur Android) et ramène l’Admin au premier plan au clic.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Web Push : nouvelle commande envoyée par le serveur, même si l’Admin est fermé.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{}}catch{}
 const icon='/images/hadhri-notification-icon.png';
 event.waitUntil(self.registration.showNotification(data.title||'Hadhri Delivery',{body:data.body||'',tag:data.tag,requireInteraction:true,vibrate:[300,100,300,100,300],icon,badge:icon,data:{url:data.url||'/admin'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=event.notification.data?.url||'/admin';
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  const admin=windows.find(w=>new URL(w.url).pathname.startsWith('/admin'));
  return admin?admin.focus():self.clients.openWindow(url);
 }));
});
