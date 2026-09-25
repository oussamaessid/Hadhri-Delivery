'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {waitForService} from '@/lib/wait-for-service';
import {LoadingScreen} from './loading-screen';

export function StartupGate({children}:{children:ReactNode}) {
 const [ready,setReady]=useState(false);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  waitForService(controller.signal).then(()=>{if(!controller.signal.aborted)setReady(true)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)});
  return()=>controller.abort();
 },[attempt]);
 if(!ready)return <LoadingScreen error={error} onRetry={()=>{setError('');setAttempt(value=>value+1)}}/>;
 return children;
}
