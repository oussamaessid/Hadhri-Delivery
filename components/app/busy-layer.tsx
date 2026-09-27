'use client';
import {LoaderCircle} from 'lucide-react';
import {t,useLanguage} from '@/lib/i18n/react';
import {useBusy} from '@/lib/busy';

export function BusyLayer(){
 useLanguage();
 const busy=useBusy();
 if(!busy)return null;
 return <div className={'busy-layer'+(busy.solid?' solid':'')} role="status" aria-live="polite"><div className="busy-card"><LoaderCircle size={34} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/><p>{t(busy.message)}</p></div></div>;
}
