import {requestJson} from '@/lib/api';
import {initialState,legacyCatalogProducts,catalog,type DemoState} from '../data/demo';
const KEY='wasla-admin-demo-v1';
// Device-local demonstration repository. Replace at the application boundary with ApiClient for production.
export const demoRepository={load():DemoState{try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed.catalog?.drivers&&parsed.orders&&parsed.settings&&parsed.notifications){parsed.catalog.products=parsed.catalog.products.map((p:typeof catalog.products[number])=>{const old=legacyCatalogProducts.find(x=>x.id===p.id),fresh=catalog.products.find(x=>x.id===p.id);return old&&fresh&&p.name===old.name&&p.value===old.value?{...p,name:fresh.name,value:fresh.value}:p;});return parsed;}}}catch{}return initialState();},save(state:DemoState){localStorage.setItem(KEY,JSON.stringify(state));}};
export class ApiClient{
 constructor(private baseUrl='/api/v1',private token?:string){}
 async request<T>(path:string,options:RequestInit={}):Promise<T>{const headers=new Headers(options.headers);if(this.token&&!headers.has('Authorization'))headers.set('Authorization',`Bearer ${this.token}`);return requestJson<T>(this.baseUrl+path,{...options,headers});}
 list<T>(resource:string){return this.request<{items:T[];total:number}>(`/${resource}`);}
 create<T>(resource:string,data:unknown){return this.request<T>(`/${resource}`,{method:'POST',body:JSON.stringify(data)});}
 update<T>(resource:string,id:string,data:unknown){return this.request<T>(`/${resource}/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});}
}
