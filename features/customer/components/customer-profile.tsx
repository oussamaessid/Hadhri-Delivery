'use client';
import {t,useLanguage} from "@/lib/i18n/react";

import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {api} from '../services/local-store';
import type {CustomerAccount} from './customer-account';
import {LoyaltyProfileSection} from './loyalty';
import type {LoyaltySummary} from '../services/loyalty';
export function CustomerProfileDialog({open,onOpenChange,account,onUpdated,onLogout,loyalty}:{open:boolean;onOpenChange:(open:boolean)=>void;account:CustomerAccount|null;onUpdated:(account:CustomerAccount)=>void;onLogout:()=>void;loyalty?:LoyaltySummary|null}){
 useLanguage();

 const [edit,setEdit]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
 if(!account)return null;
 return <Dialog open={open} onOpenChange={next=>{onOpenChange(next);if(!next)setEdit(false)}}><DialogContent className="customer-auth-dialog"><DialogTitle>{t("Mon profil")}</DialogTitle><DialogDescription>{t("Vos informations personnelles.")}</DialogDescription>{t(edit?<form className="customer-form" onSubmit={async e=>{e.preventDefault();if(pending)return;setPending(true);setError('');const data=Object.fromEntries(new FormData(e.currentTarget));try{const result=await api<{customer:CustomerAccount}>('/customer/profile',{method:'PATCH',body:JSON.stringify(data)});onUpdated(result.customer);setEdit(false)}catch(e){setError((e as Error).message)}finally{setPending(false)}}}><label>{t("Nom complet")}<input name="name" defaultValue={account.name} minLength={2} maxLength={100} required/></label><label>{t("Téléphone")}<input name="phone" type="tel" defaultValue={account.phone} required/></label><label>{t("Email")}<input value={account.email} disabled/></label>{t(error&&<p role="alert" className="checkout-error">{t(error)}</p>)}<div className="profile-actions"><button type="button" className="customer-secondary" onClick={()=>{setEdit(false);setError('')}}>{t("Annuler")}</button><button disabled={pending} className="customer-primary">{t(pending?'Enregistrement…':'Enregistrer')}</button></div></form>:<><div className="profile-details"><div><small>{t("Nom complet")}</small><b>{t(account.name)}</b></div><div><small>{t("Email")}</small><b>{t(account.email)}</b></div><div><small>{t("Téléphone")}</small><b>{t(account.phone)}</b></div></div>{t(loyalty&&<LoyaltyProfileSection loyalty={loyalty}/>)}<div className="profile-actions"><button className="customer-secondary" onClick={()=>setEdit(true)}>{t("Modifier")}</button><button className="customer-primary" onClick={onLogout}>{t("Déconnexion")}</button></div></>)}</DialogContent></Dialog>
}
