'use client';
import {t,useLanguage} from "@/lib/i18n/react";

import {useEffect,useState} from 'react';
import Image from 'next/image';
import type {Auth,User} from 'firebase/auth';
import {MailCheck,ArrowLeft,LoaderCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {refresh} from '../services/local-store';
import {loadFirebaseAuth,authError,emailSignIn,registerWithEmail,socialSignIn,sendVerificationLink,exchangeFirebaseSession,resetPassword,type CustomerAccount} from '../services/firebase-auth';
export type {CustomerAccount} from '../services/firebase-auth';
export function CustomerAccountDialog({open,onOpenChange,onSignedIn}:{open:boolean;onOpenChange:(open:boolean)=>void;onSignedIn:(account:CustomerAccount)=>void}){
 useLanguage();

 const [auth,setAuth]=useState<Auth|null>(null),[mode,setMode]=useState('login'),[error,setError]=useState(''),[configurationError,setConfigurationError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[verification,setVerification]=useState<User|null>(null),[retryAt,setRetryAt]=useState(0),[seconds,setSeconds]=useState(0);
 useEffect(()=>{if(!open)return;let active=true;loadFirebaseAuth().then(value=>{if(active){setAuth(value);setConfigurationError('');if(value.currentUser&&!value.currentUser.emailVerified)setVerification(value.currentUser)}}).catch(error=>{if(active)setConfigurationError(authError(error))});return()=>{active=false}},[open]);
 useEffect(()=>{const tick=()=>setSeconds(Math.max(0,Math.ceil((retryAt-Date.now())/1000)));const timer=setInterval(tick,1000);return()=>clearInterval(timer)},[retryAt]);
 const run=async(action:()=>Promise<void>)=>{if(pending)return;setPending(true);setError('');setNotice('');try{await action()}catch(error){setError(authError(error))}finally{setPending(false)}};
 const send=async(user:User)=>{await sendVerificationLink(user);setRetryAt(Date.now()+60000);setSeconds(60);setNotice('Lien de vérification envoyé. Consultez aussi vos courriers indésirables.')};
 const finish=async(user:User)=>{if(!user.emailVerified){setVerification(user);return}const customer=await exchangeFirebaseSession(user,true);await refresh();onSignedIn(customer);setVerification(null);onOpenChange(false)};
 const social=()=>{if(!auth||pending)return;void run(async()=>{const user=await socialSignIn(auth);if(!user.emailVerified){setVerification(user);await send(user)}else await finish(user)})};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="customer-auth-dialog firebase-auth-dialog">
  <div className="auth-brand-mark"><Image src="/images/hadhri-logo-transparent.png" alt={t("Hadhri Delivery")} width={64} height={64} unoptimized/></div>
  <DialogTitle>{t(verification?'Confirmez votre email':mode==='register'?'Bienvenue chez Hadhri':mode==='reset'?'Mot de passe oublié ?':'Heureux de vous retrouver')}</DialogTitle>
  <DialogDescription>{t(verification?'Un dernier clic pour commencer à commander.':'Vos envies à Monastir, livrées chez vous.')}</DialogDescription>
  {t(verification?<div className="customer-form verification-panel"><MailCheck size={40}/><p>{t("Ouvrez le lien envoyé à ")}<strong>{t(verification.email||'votre adresse email')}</strong>{t(", puis revenez ici.")}</p><button className="customer-primary" disabled={pending} onClick={()=>void run(async()=>{await verification.reload();const user=auth?.currentUser;if(!user?.emailVerified)throw new Error('Votre adresse n’est pas encore confirmée. Ouvrez le lien reçu, puis réessayez.');await finish(user)})}>{t(pending?'Vérification…':'J’ai confirmé mon email')}</button><button className="customer-secondary" disabled={pending||seconds>0} onClick={()=>void run(()=>send(verification))}>{t(seconds>0?`Renvoyer le lien dans ${seconds} s`:'Renvoyer le lien')}</button><button className="auth-text-button" disabled={pending} onClick={()=>{setVerification(null);setMode('login');setError('');setNotice('')}}><ArrowLeft size={14}/>{t(" Utiliser un autre compte")}</button></div>:<>
   {t(mode!=='reset'&&<><div className="auth-social-buttons"><button type="button" disabled={!auth||pending} onClick={()=>social()}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>{t(" Continuer avec Google")}</button></div><div className="auth-divider"><span>{t("ou avec votre email")}</span></div><Tabs value={mode} onValueChange={value=>{setMode(value);setError('');setNotice('')}}><TabsList><TabsTrigger value="login" disabled={pending}>{t("Connexion")}</TabsTrigger><TabsTrigger value="register" disabled={pending}>{t("Inscription")}</TabsTrigger></TabsList></Tabs></>)}
   <form className="customer-form" key={mode} onSubmit={e=>{e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;void run(async()=>{
    if(mode==='reset'){await resetPassword(input.email);setNotice('Si cette adresse possède un compte, vous recevrez un lien de réinitialisation.');return}
    if(mode==='register'){const user=await registerWithEmail({email:input.email,password:input.password,name:input.name,phone:input.phone.replace(/[\s.-]/g,'')});setVerification(user);await send(user)}else await finish(await emailSignIn(input.email,input.password));
   })}}>
    {t(mode==='register'&&<><label>{t("Nom complet")}<input name="name" autoComplete="name" minLength={2} maxLength={100} required/></label><label>{t("Téléphone")}<input name="phone" type="tel" autoComplete="tel" pattern="(\+216)?[0-9]{8}" placeholder={t("Votre numéro tunisien")} required/></label></>)}
    <label>{t("Email")}<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
    {t(mode!=='reset'&&<label>{t("Mot de passe")}<input name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} minLength={8} maxLength={200} required/></label>)}
    {t(mode==='register'&&<small>{t("8 caractères minimum. Confirmez ensuite votre adresse grâce au lien reçu par email.")}</small>)}
    <button disabled={!auth||pending} className="customer-primary">{t(pending?<><LoaderCircle size={16} className="auth-spinner"/>{t(" Un instant…")}</>:mode==='register'?'Créer mon compte':mode==='reset'?'Recevoir le lien':'Me connecter')}</button>
    <button type="button" className="auth-text-button" disabled={pending} onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setNotice('')}}>{t(mode==='reset'?'Revenir à la connexion':'Mot de passe oublié ?')}</button>
   </form></>)}
  {t((error||configurationError)&&<p role="alert" className="checkout-error">{t(error||configurationError)}</p>)}{t(notice&&<p role="status" className="auth-success-note">{t(notice)}</p>)}
  <p className="account-cart-note">{t("Votre panier vous attend. Le catalogue reste accessible sans compte.")}</p>
 </DialogContent></Dialog>;
}
