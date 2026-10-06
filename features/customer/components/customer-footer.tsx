'use client';
import Link from 'next/link';
/* eslint-disable @next/next/no-img-element */
import {Clock,Mail,MapPin,MessageCircle,Phone} from 'lucide-react';
import {t} from '@/lib/i18n/react';

// Public contact details shown in the footer. Phone numbers use the international format without spaces.
const CONTACT={
 phones:['+21655596753','+21655040084'],
 whatsapp:'+21655596753',
 email:'contact@hadhri-delivery.tn',
 area:'Monastir',
 hours:'Tous les jours, 11h – 1h',
};
const displayPhone=(n:string)=>n.replace(/^\+216(\d{2})(\d{3})(\d{3})$/,'+216 $1 $2 $3');

export function CustomerFooter({onHome}:{onHome?:()=>void}={}){
 return <footer className="customer-footer">
  <div className="footer-grid">
   <div className="footer-brand">
    <Link className="brand" href="/" onClick={onHome&&(e=>{e.preventDefault();onHome()})}><img src="/images/hadhri-logo-transparent.png" alt=""/>{t('Hadhri Delivery')}</Link>
    <p>{t('Un peu plus proche de ce que vous aimez.')}</p>
    <a className="footer-cta" href={`https://wa.me/${CONTACT.whatsapp.replace('+','')}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/>{t('Commander sur WhatsApp')}</a>
   </div>
   <div className="footer-col">
    <h2>{t('Contact')}</h2>
    {CONTACT.phones.map(n=><a key={n} href={`tel:${n}`}><Phone size={17}/>{displayPhone(n)}</a>)}
    <a href={`mailto:${CONTACT.email}`}><Mail size={17}/>{CONTACT.email}</a>
   </div>
   <div className="footer-col">
    <h2>{t('Livraison')}</h2>
    <span><MapPin size={17}/>{t(CONTACT.area)}</span>
    <span><Clock size={17}/>{t(CONTACT.hours)}</span>
   </div>
  </div>
  <div className="footer-bottom">
   <span>© {new Date().getFullYear()} {t('Hadhri Delivery')}. {t('Tous droits réservés.')}</span>
  </div>
 </footer>;
}
