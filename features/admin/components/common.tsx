'use client';
import {t,useLanguage} from "@/lib/i18n/react";

/* eslint-disable @next/next/no-img-element */
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {labels} from '../data/demo';
export function Badge({status}:{status:string}){
 useLanguage();
return <span className={'badge status-'+status}>{t(labels[status]||status)}</span>}
export function Choice({value,onChange,options,label}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];label:string}){
 useLanguage();
return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={t(label)}><SelectValue placeholder={t(label)}/></SelectTrigger><SelectContent>{t(options.map(o=><SelectItem key={o.value} value={o.value}>{t(o.label)}</SelectItem>))}</SelectContent></Select>}
export function Avatar({name,image}:{name:string;image?:string}){
 useLanguage();
return <span className={'avatar tone-'+name.length%5}>{t(image?<img src={image} alt={t("")}/>:name.split(' ').slice(0,2).map(s=>s[0]).join(''))}</span>}
