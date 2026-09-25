/** Only probe a safe GET: never replay an order or authentication mutation. */
export async function waitForService(signal:AbortSignal, {timeoutMs=120000,intervalMs=2500}={}) {
 const started=Date.now();
 while(!signal.aborted && Date.now()-started<timeoutMs) {
  try {
   const response=await fetch('/api/v1/health',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(10000)])});
   if(response.ok && response.headers.get('content-type')?.includes('application/json')) {
    const result=await response.json() as {status?:string};
    if(result.status==='ok')return;
   }
  } catch { if(signal.aborted)throw signal.reason; }
  await new Promise<void>((resolve,reject)=>{
   const cleanup=()=>signal.removeEventListener('abort',abort);
   const timer=setTimeout(()=>{cleanup();resolve()},intervalMs);
   const abort=()=>{clearTimeout(timer);cleanup();reject(signal.reason)};
   signal.addEventListener('abort',abort,{once:true});
   if(signal.aborted)abort();
  });
 }
 throw new Error('Le service met plus de temps à démarrer. Veuillez réessayer.');
}
