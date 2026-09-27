import {useSyncExternalStore} from 'react';
// Global loading overlay: wrap a slow action to show a spinner and message until it settles.
type Entry={message:string;solid:boolean};
let active:Entry[]=[];
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
// delay: quick actions finish before the overlay appears, so it never flashes.
// solid: an opaque screen that also hides dialogs underneath (e.g. the sign-in window while the account is checked).
export async function withBusy<T>(message:string,task:()=>Promise<T>,{delay=0,solid=false}:{delay?:number;solid?:boolean}={}):Promise<T>{
 const entry={message,solid};const show=()=>{active=[...active,entry];emit()};
 const timer=delay?setTimeout(show,delay):undefined;if(!delay)show();
 try{return await task()}finally{clearTimeout(timer);if(active.includes(entry)){active=active.filter(e=>e!==entry);emit()}}
}
export function useBusy(){return useSyncExternalStore(subscribe,()=>active.at(-1)??null,()=>null)}
