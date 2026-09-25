'use client';
import {t,useLanguage} from "@/lib/i18n/react";

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {useEffect,useState} from 'react';
import AdminApp from './admin-app';
import {LoadingScreen} from '@/components/app/loading-screen';
import {api} from '../customer/services/local-store';
export default function AdminGate(){
 useLanguage();
const [status,setStatus]=useState<{authenticated:boolean;setupRequired:boolean}|null>(null);const [error,setError]=useState('');const [pending,setPending]=useState(false);const [attempt,setAttempt]=useState(0);useEffect(()=>{api<{authenticated:boolean;setupRequired:boolean}>('/auth/status').then(setStatus).catch(e=>{setError(e.message);setStatus(null)})},[attempt]);if(!status&&error)return <main className="auth-panel"><img src="/images/hadhri-logo-transparent.png" alt={t('Hadhri Delivery')}/><h1>{t('Connexion indisponible')}</h1><p role="alert">{t(error)}</p><button className="customer-primary" onClick={()=>{setError('');setAttempt(value=>value+1)}}>{t('Réessayer')}</button><Link href="/">{t('Retour au site client')}</Link></main>;if(!status)return <LoadingScreen/>;if(status.authenticated)return <AdminApp/>;return <main className="auth-panel"><img src="/images/hadhri-logo-transparent.png" alt={t("Hadhri Delivery")}/><h1>{t(status?.setupRequired?'Créer votre accès Admin':'Connexion Admin')}</h1><p>{t(status?.setupRequired?'Choisissez votre mot de passe administrateur (12 caractères minimum).':'Entrez votre mot de passe pour gérer votre plateforme.')}</p><form onSubmit={async e=>{e.preventDefault();setPending(true);setError('');const password=new FormData(e.currentTarget).get('password');try{await api(status?.setupRequired?'/auth/setup':'/auth/login',{method:'POST',body:JSON.stringify({password})});setStatus({authenticated:true,setupRequired:false})}catch(e){setError((e as Error).message)}finally{setPending(false)}}}><label>{t("Mot de passe")}<input type="password" name="password" autoComplete={status?.setupRequired?'new-password':'current-password'} minLength={12} required/></label>{t(error&&<p role="alert">{t(error)}</p>)}<button className="customer-primary" disabled={!status||pending}>{t(pending?'Connexion…':status?.setupRequired?'Créer mon accès':'Se connecter')}</button></form><Link href="/">{t("Retour au site client")}</Link></main>}
