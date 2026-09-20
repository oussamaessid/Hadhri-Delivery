import type { Order, DemoState } from '../data/demo';
const todayTunis=new Date(Date.now()+3600000).toISOString().slice(0,10);
export const referenceDate = new Date(`${todayTunis}T23:59:59+01:00`);
const localReference=new Date(referenceDate.getTime()+3600000);
const weekDays=(localReference.getUTCDay()+6)%7+1;
const monthDays=localReference.getUTCDate();
export function inPeriod(order:Order,days:number){const diff=(referenceDate.getTime()-new Date(order.date).getTime())/86400000;return diff>=0&&diff<days;}
// Calendar periods follow Tunis time, including newly created customer orders.
export function metrics(state:DemoState){return {users:state.catalog.customers.length+state.catalog.drivers.length+1,restaurants:state.catalog.restaurants.length,departments:state.catalog.departments.length,products:state.catalog.products.length,orders:state.orders.length,today:state.orders.filter(o=>inPeriod(o,1)).length,week:state.orders.filter(o=>inPeriod(o,weekDays)).length,month:state.orders.filter(o=>inPeriod(o,monthDays)).length,revenue:state.orders.filter(o=>o.status==='DELIVERED').reduce((sum,o)=>sum+o.total,0),active:state.catalog.drivers.filter(d=>['AVAILABLE','BUSY'].includes(d.status)).length,available:state.catalog.drivers.filter(d=>d.status==='AVAILABLE').length};}
export function chartData(orders:Order[],days:number){const bucket=days>30?Math.ceil(days/12):days>7?Math.ceil(days/10):1;return Array.from({length:Math.ceil(days/bucket)},(_,i)=>{const end=days-i*bucket;const start=Math.max(0,end-bucket);const items=orders.filter(o=>inPeriod(o,end)&&!inPeriod(o,start));const date=new Date(referenceDate.getTime()-start*86400000);return {name:date.toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),Commandes:items.length,Revenus:items.filter(o=>o.status==='DELIVERED').reduce((s,o)=>s+o.total,0)};});}
