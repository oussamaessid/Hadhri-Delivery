
import {t,useLanguage} from "@/lib/i18n/react";
import {MapPin} from 'lucide-react';
export function DeliveryLocation({city}:{city:string}){
 useLanguage();

 return <div className="delivery-address delivery-location"><MapPin size={20}/><span><small>{t("Livraison à")}</small><b>{t(city)}</b></span></div>;
}
