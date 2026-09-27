// Service worker Hadhri : affiche les notifications de commande (obligatoire sur Android) et ramène l’Admin au premier plan au clic.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=event.notification.data?.url||'/admin';
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
  const admin=windows.find(w=>new URL(w.url).pathname.startsWith('/admin'));
  return admin?admin.focus():self.clients.openWindow(url);
 }));
});
