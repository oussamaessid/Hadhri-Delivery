import {LoaderCircle} from 'lucide-react';

export function LoadingScreen({error,onRetry,message="Connexion à Hadhri Delivery…"}:{error?:string;onRetry?:()=>void;message?:string}) {
 return <div style={{position:'fixed',inset:0,zIndex:9999,background:'#fff',color:'#2446b8',display:'grid',placeItems:'center',minHeight:'100dvh'}}>
  {error ? <div style={{textAlign:'center',padding:24,color:'#252525'}}><p role="alert">{error}</p><button type="button" onClick={onRetry} style={{marginTop:20,padding:'12px 24px',borderRadius:12,background:'#2446b8',color:'#fff'}}>Réessayer</button></div> : <div role="status" aria-live="polite" style={{display:"grid",justifyItems:"center",gap:16,textAlign:"center",padding:24}}><LoaderCircle size={38} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/><strong>{message}</strong><span style={{color:"#64748b",fontSize:14}}>Nous préparons votre catalogue.</span></div>}
 </div>;
}
