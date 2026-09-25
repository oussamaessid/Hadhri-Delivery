'use client';
import {requestJson} from '@/lib/api';
import {startPolling} from '@/lib/polling';
import {localizeState} from '@/lib/i18n/catalog';
import {useMemo,useSyncExternalStore} from 'react';
import {type DemoState} from '../../admin/data/demo';
import {type CheckoutInput} from './checkout';
const empty:DemoState={catalog:{restaurants:[],products:[],categories:[],departments:[],customers:[],drivers:[]},orders:[],notifications:[],settings:{name:'Hadhri Delivery',email:'',fee:4,loyaltyEnabled:true}};
let cached=empty,revision=0;
let inFlight:Promise<void>|undefined,stopPolling:(()=>void)|undefined;
const snapshotListeners=new Set<(state:DemoState)=>void>();
const listeners=new Set<()=>void>();
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{return requestJson<T>('/api/v1'+path+(path.includes('?')?'&':'?')+'lang=fr',options);}
function notify(){listeners.forEach(fn=>fn())}
function refreshRequest(signal?:AbortSignal):Promise<void>{
 if(inFlight)return inFlight;
 inFlight=(async()=>{try{
  const result=await api<{state:DemoState;revision:number}>(location.pathname.startsWith('/admin')?'/admin/state':'/state',{signal});
  if(signal?.aborted)return;
  cached=result.state;revision=result.revision;notify();
  snapshotListeners.forEach(fn=>fn(cached));
  window.dispatchEvent(new CustomEvent('api-status',{detail:''}));
 }catch(e){if(!signal?.aborted)window.dispatchEvent(new CustomEvent('api-status',{detail:(e as Error).message}));throw e}
 finally{inFlight=undefined}})();
 return inFlight;
}
export async function refresh(){try{await refreshRequest()}catch{/* API status is already displayed. */}}
function ensurePolling(){if(!stopPolling)stopPolling=startPolling(refreshRequest,location.pathname.startsWith('/admin')?5000:10000)}
function releasePolling(){if(!listeners.size&&!snapshotListeners.size){stopPolling?.();stopPolling=undefined}}
function subscribe(fn:()=>void){listeners.add(fn);ensurePolling();return()=>{listeners.delete(fn);releasePolling()}}
export function subscribeSnapshots(fn:(state:DemoState)=>void){snapshotListeners.add(fn);ensurePolling();return()=>{snapshotListeners.delete(fn);releasePolling()}}
export async function writeState(next:DemoState){const changes:{kind:string;id?:string;value:unknown}[]=[];for(const kind of [...Object.keys(cached.catalog),'orders','notifications']){const before=cached.catalog[kind]||cached[kind as 'orders'|'notifications'];const after=next.catalog[kind]||next[kind as 'orders'|'notifications'];for(const row of after)if(JSON.stringify(row)!==JSON.stringify(before.find(p=>p.id===row.id)))changes.push({kind,id:row.id,value:row});for(const row of before)if(!after.some(p=>p.id===row.id))changes.push({kind,id:row.id,value:null})}if(JSON.stringify(cached.settings)!==JSON.stringify(next.settings))changes.push({kind:'settings',value:next.settings});try{if(changes.length)await api('/admin/state',{method:'PATCH',body:JSON.stringify({revision,changes})});await refresh()}catch(e){await refresh();window.dispatchEvent(new CustomEvent('api-status',{detail:(e as Error).message}));throw e}}
export function useDemoStore(){const state=useSyncExternalStore(subscribe,()=>cached,()=>empty);const localized=useMemo(()=>localizeState(state,'fr'),[state]);return [typeof window!=="undefined"&&window.location.pathname.startsWith("/admin")?state:localized,writeState] as const}
export async function placeLocalOrder(input:CheckoutInput){const orders=await api<DemoState['orders']>('/orders',{method:'POST',body:JSON.stringify(input)});await refresh();return orders}
