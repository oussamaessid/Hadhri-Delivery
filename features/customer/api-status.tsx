'use client';
import {t,useLanguage} from "@/lib/i18n/react";

import {useEffect,useState} from 'react';
export function ApiStatus(){
 useLanguage();
const [message,setMessage]=useState('');useEffect(()=>{const listen=(event:Event)=>setMessage((event as CustomEvent<string>).detail);window.addEventListener('api-status',listen);return()=>window.removeEventListener('api-status',listen)},[]);return message?<div className="api-status" role="alert">{t(message)}</div>:null}
