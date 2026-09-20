'use client';
import {useEffect,useRef} from 'react';
import {refresh} from '../../customer/services/local-store';
import {notifyNewOrder} from './order-alerts';
export type IncomingOrder={id:string;customer:string;merchant:string;total:number;items:{name:string;quantity:number}[]};
export function useOrderStream(onOrder?:(order:IncomingOrder)=>void){
 const handler=useRef(onOrder);
 useEffect(()=>{handler.current=onOrder},[onOrder]);
 useEffect(()=>{
  let socket:WebSocket|undefined,closed=false,retry=1000,timer:ReturnType<typeof setTimeout>|undefined;
  const devBackend=location.port==='5173';
  const base=devBackend?'ws://'+location.hostname+':3001':(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host;
  const connect=()=>{
   socket=new WebSocket(base+'/api/v1/admin/stream');
   socket.onopen=()=>{retry=1000};
   socket.onmessage=event=>{
    try{
     const message=JSON.parse(event.data);
     if(message.type==='orders')for(const order of message.orders as IncomingOrder[]){notifyNewOrder(order);handler.current?.(order)}
    }catch{}
    void refresh();
   };
   socket.onclose=()=>{if(closed)return;timer=setTimeout(connect,retry);retry=Math.min(retry*2,15000)};
   socket.onerror=()=>socket?.close();
  };
  connect();
  return ()=>{closed=true;clearTimeout(timer);socket?.close()};
 },[]);
}
