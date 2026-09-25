'use client';
import {useEffect,useRef} from 'react';
import {subscribeSnapshots} from './local-store';
import {createOrderTracker} from '@/lib/order-changes';
export type CustomerOrderUpdate={id:string;status:string;driver:string;total:number;merchant:string};
export function useCustomerOrderStream(accountId:string|null|undefined,onUpdate?:(orders:CustomerOrderUpdate[])=>void){
 const handler=useRef(onUpdate);
 useEffect(()=>{handler.current=onUpdate},[onUpdate]);
 useEffect(()=>{
  if(!accountId)return;
  const track=createOrderTracker<CustomerOrderUpdate>();
  return subscribeSnapshots(state=>{
   const {changed}=track(state.orders);
   if(changed.length)handler.current?.(changed);
  });
 },[accountId]);
}
