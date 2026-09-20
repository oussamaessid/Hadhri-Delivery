export const weekdays=['mon','tue','wed','thu','fri','sat','sun'] as const;
export type Weekday=typeof weekdays[number];
export const weekdayLabels:Record<Weekday,string>={mon:'Lundi',tue:'Mardi',wed:'Mercredi',thu:'Jeudi',fri:'Vendredi',sat:'Samedi',sun:'Dimanche'};
export type Entity = { translations?:Partial<Record<"fr",{name?:string;description?:string;detail?:string}>>; department?:string; merchantId?:string;categoryId?:string;description?:string;image?:string;icon?:string;variants?:{id:string;name:string;price:number}[]; id: string; name: string; status: string; detail: string; value: number; phone?: string; stock?: number; category?: string; merchant?: string; vehicle?: string; zone?: string; scheduleDays?:Weekday[]; scheduleOpen?:string; scheduleClose?:string };
export function scheduleLabel(m:Entity):string{
 const days=m.scheduleDays;
 if(!days||!days.length)return '';
 const allDays=weekdays.every(d=>days.includes(d));
 const dayText=allDays?'Tous les jours':days.map(d=>weekdayLabels[d]).join(', ');
 const hours=m.scheduleOpen&&m.scheduleClose?` · ${m.scheduleOpen} - ${m.scheduleClose}`:'';
 return dayText+hours;
}
export function isOpenNow(m:Entity):boolean|null{
 if(!m.scheduleDays||!m.scheduleDays.length||!m.scheduleOpen||!m.scheduleClose)return null;
 const now=new Date();
 const day=weekdays[(now.getDay()+6)%7];
 if(!m.scheduleDays.includes(day))return false;
 const [oh,om]=m.scheduleOpen.split(':').map(Number);
 const [ch,cm]=m.scheduleClose.split(':').map(Number);
 const minutes=now.getHours()*60+now.getMinutes();
 return minutes>=oh*60+om&&minutes<ch*60+cm;
}
export type Order = {customerAccountId?:string;requestId?:string;clientSessionId?:string;phone?:string;notes?:string;deliveryFee?:number;loyaltyDiscountDt?:number;id:string; customer:string; merchant:string; total:number; status:string; date:string; driver:string; address:string; items:{productId?:string;name:string;quantity:number;price:number}[]};
export const statuses = ['PENDING','CONFIRMED','PREPARING','READY_FOR_PICKUP','DRIVER_ASSIGNED','PICKED_UP','ON_THE_WAY','DELIVERED','CANCELLED'];
export const labels: Record<string,string> = {PENDING:'En attente',CONFIRMED:'Confirmée',PREPARING:'En préparation',READY_FOR_PICKUP:'Prête',DRIVER_ASSIGNED:'Livreur assigné',PICKED_UP:'Récupérée',ON_THE_WAY:'En livraison',DELIVERED:'Livrée',CANCELLED:'Annulée',ACTIVE:'Actif',INACTIVE:'Inactif',AVAILABLE:'Disponible',BUSY:'En course',OFFLINE:'Hors ligne',SUSPENDED:'Suspendu'};
export const money = (n:number) => new Intl.NumberFormat('fr-TN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' DT';
const restaurantNames=['Chez Monastir','Pizza & Fast-food Monastir','Saveurs de la Mer','Le Verger Monastirien','Le Poulet Doré'];
const customerNames=['Amira Ben Ali','Youssef Trabelsi','Inès Mansour','Aziz Gharbi','Mariem Jaziri','Sami Ben Amor','Nour Chérif','Omar Khalil'];
export const catalog:Record<string,Entity[]> = {
 restaurants:restaurantNames.map((name,i)=>({id:'R'+(i+1),name,status:i===4?'INACTIVE':'ACTIVE',detail:['Cuisine tunisienne traditionnelle et plats préparés à la demande · Monastir','Pizzas, sandwichs et fast-food · Monastir','Poissons frais et plats de la mer · Monastir','Fruits et légumes, jus frais et fruits secs · Monastir','Poulet rôti et grillades · Monastir'][i],value:4.5+i*.1,phone:'+216 73 000 10'+i})),
 categories:['Pizzas','Sandwichs','Plats tunisiens','Poissons','Desserts','Boissons'].map((name,i)=>({id:'C'+(i+1),name,status:'ACTIVE',detail:'Restaurant',value:i+1})),
 customers:customerNames.map((name,i)=>({id:'U'+(i+1),name,status:'ACTIVE',detail:['Centre-ville Monastir','Skanes','Khniss','Ksibet El Mediouni'][i%4],value:8+i*3,phone:'+216 20 000 10'+i})),
 drivers:['Mehdi Trabelsi','Ahmed Ben Salem','Sarra Ayadi','Fares Mansour','Walid Gharbi'].map((name,i)=>({id:'D'+(i+1),name,status:['AVAILABLE','BUSY','AVAILABLE','BUSY','OFFLINE'][i],detail:['Centre-ville Monastir','Skanes','Khniss','Ksibet El Mediouni','Sahline'][i],zone:['Centre-ville Monastir','Skanes','Khniss','Ksibet El Mediouni','Sahline'][i],vehicle:i===2?'Vélo':'Moto',value:4.7+i*.05,phone:'+216 22 000 10'+i})),
 products:[],
 departments:[]
};
const foods=['Pizza Margherita','Poulet rôti','Jus d’orange frais','Salade tunisienne','Eau minérale','Fruits secs assortis','Pizza Thon','Sandwich poulet','Couscous poulet','Brik à l’œuf','Ojja merguez','Lablabi','Poisson grillé','Tacos poulet','Frites maison'];
catalog.products = Array.from({length:30},(_,i)=>({id:'P'+(i+1),name:foods[i%15],status:i%17===0?'INACTIVE':'ACTIVE',detail:restaurantNames[i%5],merchant:restaurantNames[i%5],category:'Restaurant',value:Number((8+(i%15)*1.5).toFixed(2)),stock:i%17===0?0:12+i%38}));
export const legacyCatalogProducts=structuredClone(catalog.products);
const menus:[string,number][][]=[
 [['Couscous poulet',22],['Ojja merguez',18],['Brik à l’œuf',5],['Salade tunisienne',8],['Lablabi',9],['Thé à la menthe',3]],
 [['Pizza Margherita',12],['Pizza 4 Fromages',17],['Pizza Thon',15],['Sandwich poulet',9],['Tacos poulet',14],['Frites maison',5]],
 [['Poisson grillé',24],['Calamars frits',19],['Riz aux fruits de mer',21],['Soupe de poisson',9],['Salade de la mer',14],['Eau minérale',2]],
 [['Jus d’orange frais',6],['Jus de grenade',7],['Salade de fruits',8],['Fruits secs assortis',15],['Eau minérale',2],['Thé glacé maison',4]],
 [['Poulet rôti',18],['Poulet grillé',16],['Brochettes de poulet',14],['Salade César au poulet',12],['Frites maison',5],['Eau minérale',2]]];
catalog.products=catalog.products.map((p,i)=>{const [name,value]=menus[i%5][Math.floor(i/5)];return {...p,name,value};});
// Each merchant owns its categories; identifiers remain stable when names change.
catalog.categories=[];
for(const merchant of catalog.restaurants){
 merchant.image=merchant.id==='R2'?'/images/burger.jpg':'/images/pizza.jpg';
 const own=catalog.products.filter(p=>p.merchant===merchant.name);
 for(const p of own){
 const category=/Pizza/.test(p.name)?'Pizzas':/Sandwich|Tacos|Frites/.test(p.name)?'Sandwichs & Fast-food':/Jus|Eau|Thé|Boisson/.test(p.name)?'Boissons':/Fruits secs|Salade de fruits/.test(p.name)?'Fruits & douceurs':/Poisson|Calamars|Riz aux fruits|Soupe de poisson|Salade de la mer/.test(p.name)?'Poissons':/Poulet|Brochettes|César/.test(p.name)?'Poulet':'Plats tunisiens';
 let c=catalog.categories.find(c=>c.merchantId===merchant.id&&c.name===category);
 if(!c){c={id:merchant.id+'-C'+catalog.categories.filter(c=>c.merchantId===merchant.id).length,name:category,status:'ACTIVE',detail:merchant.name,merchantId:merchant.id,merchant:merchant.name,value:catalog.categories.length};catalog.categories.push(c)}
 p.merchantId=merchant.id;p.categoryId=c.id;p.category=c.name;p.image=merchant.image;p.description=category==='Pizzas'?'Pâte maison, sauce tomate et mozzarella, préparée à Monastir.':category==='Boissons'?'À déguster bien frais.':category==='Poissons'?'Pêche du jour, préparée à la commande.':category==='Poulet'?'Poulet fermier, mariné et grillé à la commande.':category==='Fruits & douceurs'?'Fruits frais de saison et fruits secs sélectionnés.':'Cuisine tunisienne traditionnelle, préparée à la demande.';
 if(category==='Pizzas')p.variants=[{id:'standard',name:'Classique',price:0},{id:'large',name:'Grande',price:5}];
 }
}
export function createOrders():Order[]{
 return Array.from({length:240},(_,i)=>{const daysAgo=i<18?0:i<70?1+(i%6):7+(i%54);const date=new Date(2026,8,10-daysAgo,13-(i%6),55-(i%50));const price=12+(i%15)*2.5;return {id:'CMD-'+(10482-i),customer:customerNames[i%8],merchant:restaurantNames[i%5],total:price*2+4,status:i<12?statuses[i%7]:i%19===0?'CANCELLED':'DELIVERED',date:date.toISOString(),driver:i<12?(i%7<4?'':catalog.drivers[i%2===0?1:3].name):catalog.drivers[i%5].name,address:['12 avenue Habib Bourguiba, Monastir','8 rue de l’Environnement, Monastir','24 avenue Hédi Nouira, Monastir'][i%3],items:[{name:foods[i%15],quantity:2,price}]};});
}
export type NotificationItem = {id:string;title:string;detail:string;type:string;read:boolean;orderId?:string;date?:string};
export const notifications:NotificationItem[]=[{id:'N1',title:'4 commandes attendent une confirmation',detail:'Vérifiez les nouvelles commandes avant de les transmettre aux commerces.',type:'Commandes',read:false,orderId:'CMD-10482'},{id:'N2',title:'Stock épuisé : Pizza Margherita',detail:'Chez Monastir · Le produit est temporairement indisponible.',type:'Stock',read:false},{id:'N3',title:'Mehdi Trabelsi est disponible',detail:'Zone Centre-ville Monastir · Prêt pour une nouvelle livraison.',type:'Livreurs',read:false},{id:'N4',title:'Rapport hebdomadaire disponible',detail:'Consultez les commandes et revenus dans Statistiques.',type:'Statistiques',read:true}];
export type DemoState = {catalog:Record<string,Entity[]>;orders:Order[];notifications:NotificationItem[];settings:{name:string;email:string;fee:number;loyaltyEnabled?:boolean}};
export function initialState():DemoState{return {catalog:structuredClone(catalog),orders:createOrders(),notifications:structuredClone(notifications),settings:{name:'Hadhri Delivery',email:'admin@example.com',fee:4,loyaltyEnabled:true}};}
