'use client';
import {getApps,initializeApp,type FirebaseOptions} from 'firebase/app';
import {getAuth,setPersistence,browserLocalPersistence,onIdTokenChanged,signInWithPopup,GoogleAuthProvider,FacebookAuthProvider,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,updateProfile,signOut,type Auth,type User} from 'firebase/auth';
import {api} from './local-store';
export type CustomerAccount={id:string;name:string;email:string;phone:string};
let loading:Promise<Auth>|undefined;
let sessionQueue:Promise<void>=Promise.resolve();
function sessionOperation<T>(operation:()=>Promise<T>):Promise<T>{
 const result=sessionQueue.then(operation,operation);
 sessionQueue=result.then(()=>{},()=>{});return result;
}
export function loadFirebaseAuth(){
 if(!loading)loading=(async()=>{
  const {config}=await api<{config:FirebaseOptions|null}>('/customer/firebase-config').catch(()=>{throw new Error('La connexion est momentanément indisponible. Merci de réessayer plus tard.')});
  if(!config)throw new Error('Les connexions sont en cours de configuration. Merci de réessayer plus tard.');
  const app=getApps().find(app=>app.name==='hadhri-client')||initializeApp(config,'hadhri-client');
  const auth=getAuth(app);auth.languageCode='fr';await setPersistence(auth,browserLocalPersistence);await auth.authStateReady();return auth;
 })().catch(error=>{loading=undefined;throw error});
 return loading;
}
export function authError(error:unknown){
 const code=(error as {code?:string})?.code;
 const messages:Record<string,string>={
  'auth/invalid-credential':'Email ou mot de passe incorrect.',
  'auth/email-already-in-use':'Cette adresse possède déjà un compte. Connectez-vous ou réinitialisez le mot de passe.',
  'auth/weak-password':'Choisissez un mot de passe d’au moins 8 caractères.',
  'auth/invalid-email':'Vérifiez votre adresse email.',
  'auth/popup-closed-by-user':'La fenêtre de connexion a été fermée. Vous pouvez réessayer.',
  'auth/popup-blocked':'Autorisez les fenêtres de connexion dans votre navigateur, puis réessayez.',
  'auth/account-exists-with-different-credential':'Cette adresse utilise déjà une autre méthode. Connectez-vous avec votre méthode habituelle.',
  'auth/operation-not-allowed':'Cette méthode de connexion n’est pas encore activée.',
  'auth/unauthorized-domain':'La connexion n’est pas encore autorisée sur cette adresse du site.',
  'auth/too-many-requests':'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  'auth/network-request-failed':'Connexion interrompue. Vérifiez votre connexion internet.',
  'auth/user-disabled':'Ce compte est désactivé. Contactez Hadhri Delivery.',
 };
 return (code&&messages[code])||(error instanceof Error?error.message:'Connexion impossible. Réessayez.');
}
export async function exchangeFirebaseSession(user:User,force=false){
 if(!user.emailVerified)throw new Error('Ouvrez le lien de vérification reçu par email.');
 let phone:string|undefined;try{phone=localStorage.getItem('hadhri-registration-phone:'+user.uid)||undefined}catch{}
 const idToken=await user.getIdToken(force);
 const {customer}=await sessionOperation(()=>api<{customer:CustomerAccount}>('/customer/firebase-session',{method:'POST',body:JSON.stringify({idToken,phone})}));
 try{localStorage.removeItem('hadhri-registration-phone:'+user.uid)}catch{}
 return customer;
}
export async function emailSignIn(email:string,password:string){const auth=await loadFirebaseAuth();return (await signInWithEmailAndPassword(auth,email,password)).user}
export async function registerWithEmail(input:{email:string;password:string;name:string;phone:string}){
 if(input.password.length<8)throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
 const auth=await loadFirebaseAuth();const {user}=await createUserWithEmailAndPassword(auth,input.email,input.password);
 try{localStorage.setItem('hadhri-registration-phone:'+user.uid,input.phone)}catch{}
 await updateProfile(user,{displayName:input.name});return user;
}
export function socialSignIn(provider:'google'|'facebook',auth:Auth){
 const selected=provider==='google'?new GoogleAuthProvider():new FacebookAuthProvider();
 if(provider==='facebook')selected.addScope('email');
 return signInWithPopup(auth,selected).then(result=>result.user);
}
export async function sendVerificationLink(user:User){
 if(!user.email)throw new Error('Aucune adresse email fournie. Utilisez Google ou inscrivez-vous avec votre email.');
 await sendEmailVerification(user,{url:window.location.origin+'/?verified=1',handleCodeInApp:false});
}
export async function resetPassword(email:string){await sendPasswordResetEmail(await loadFirebaseAuth(),email,{url:window.location.origin,handleCodeInApp:false})}
export async function logoutCustomer(){
 const auth=await loadFirebaseAuth();await signOut(auth);await sessionOperation(()=>api('/customer/logout',{method:'POST'}));
}
export function observeCustomer(onCustomer:(customer:CustomerAccount|null)=>void){
 let cancelled=false,unsubscribe=()=>{},generation=0;
 loadFirebaseAuth().then(auth=>{
  if(cancelled)return;
  unsubscribe=onIdTokenChanged(auth,async user=>{
   const current=++generation;
   if(!user?.emailVerified){try{await sessionOperation(()=>api('/customer/logout',{method:'POST'}))}catch{}if(!cancelled&&current===generation)onCustomer(null);return}
   try{const customer=await exchangeFirebaseSession(user);if(!cancelled&&current===generation)onCustomer(customer)}catch{if(!cancelled&&current===generation)onCustomer(null)}
  });
 }).catch(()=>{if(!cancelled)onCustomer(null)});
 return()=>{cancelled=true;generation++;unsubscribe()};
}
