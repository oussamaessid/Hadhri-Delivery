'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {getLanguage,setLanguage,subscribeLanguage,t} from './core';
export {t} from './core';
export function useLanguage(){return useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'fr' as const)}
export function LanguageInitializer(){
 useEffect(()=>{try{setLanguage('fr')}catch{setLanguage('fr')}},[]);
 return null;
}
export function LanguageButton(){
 return null;
}

export function LanguageText({value}:{value:string}){useLanguage();return <>{t(value)}</>}
