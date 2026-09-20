import type {Entity} from '../../admin/data/demo';
import {departments} from '../data/departments';
export function departmentImage(department?:Pick<Entity,'id'|'image'>){
 const preset=departments.find(d=>d.id===department?.id);
 const current=department?.image;
 return current&&current!==preset?.image.replace('.jpg','.svg')?current:preset?.image||'/images/departments/produce.jpg';
}
export function homeDepartments(records:Entity[]):Entity[]{
 // Older running backends still return the retired taxonomy until their next restart.
 const legacy=records.some(d=>['cleaning','electronics','everyday','food','other','snacks','sweets','topup'].includes(d.id))&&!records.some(d=>d.id==='restaurants');
 const rows=legacy?departments.map((d,i)=>({id:d.id,name:d.name,detail:d.short,image:d.image,status:'ACTIVE',value:i})):records;
 return rows.filter(d=>d.status==='ACTIVE').sort((a,b)=>a.value-b.value);
}
export function restaurantImage(restaurant:Pick<Entity,'name'|'image'>){return restaurant.image||(/burger/i.test(restaurant.name)?'/images/burger.jpg':'/images/departments/restaurants.jpg')}
