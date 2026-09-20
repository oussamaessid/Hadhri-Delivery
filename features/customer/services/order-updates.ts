'use client';
import {useEffect,useRef} from 'react';
import {refresh} from './local-store';
export type CustomerOrderUpdate={id:string;status:string;driver:string;total:number;merchant:string};
export function useCustomerOrderStream(accountId:string|null|undefined,onUpdate?:(orders:CustomerOrderUpdate[])=>void){
 const handler=useRef(onUpdate);
 useEffect(()=>{handler.current=onUpdate},[onUpdate]);
 useEffect(()=>{
  if(!accountId)return;
  let socket:WebSocket|undefined,closed=false,retry=1000,timer:ReturnType<typeof setTimeout>|undefined;
  const devBackend=location.port==='5173';
  const base=devBackend?'ws://'+location.hostname+':3001':(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host;
  const connect=()=>{
   socket=new WebSocket(base+'/api/v1/customer/stream');
   socket.onopen=()=>{retry=1000};
   socket.onmessage=event=>{
    try{
     const message=JSON.parse(event.data);
     if(message.type==='order-status'&&Array.isArray(message.orders))handler.current?.(message.orders as CustomerOrderUpdate[]);
    }catch{}
    void refresh();
   };
   socket.onclose=()=>{if(closed)return;timer=setTimeout(connect,retry);retry=Math.min(retry*2,15000)};
   socket.onerror=()=>socket?.close();
  };
  connect();
  return ()=>{closed=true;clearTimeout(timer);socket?.close()};
 },[accountId]);
}
