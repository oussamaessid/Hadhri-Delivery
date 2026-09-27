'use client';
import {useEffect,useRef} from 'react';
import {subscribeSnapshots} from '../../customer/services/local-store';
import {createOrderTracker} from '@/lib/order-changes';
import {notifyNewOrder,notificationPermission,notificationWorker} from './order-alerts';
export type IncomingOrder={id:string;customer:string;merchant:string;total:number;items:{name:string;quantity:number}[]};
export function useOrderStream(onOrder?:(order:IncomingOrder)=>void){
 const handler=useRef(onOrder);
 useEffect(()=>{handler.current=onOrder},[onOrder]);
 useEffect(()=>{
  // Prépare le service worker dès l’ouverture de l’Admin pour que la première notification ne tarde pas.
  if(notificationPermission()==='granted')void notificationWorker();
  const track=createOrderTracker<IncomingOrder>();
  return subscribeSnapshots(state=>{
   for(const order of track(state.orders).added){notifyNewOrder(order);handler.current?.(order)}
  });
 },[]);
}
