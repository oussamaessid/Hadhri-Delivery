export type Language='fr';
export const languages:Language[]=['fr'];
export const validLanguage=(_value:unknown):Language=>'fr';
let language:Language='fr';
const listeners=new Set<()=>void>();
export const getLanguage=()=>language;
export const subscribeLanguage=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function setLanguage(_value:unknown){language='fr';if(typeof document!=='undefined'){document.documentElement.lang='fr';document.documentElement.dir='ltr';try{localStorage.setItem('hadhri-language','fr')}catch{}}listeners.forEach(fn=>fn())}
export function translate<T>(value:T,_locale:Language):T {
 return value;
}
export const t=<T,>(value:T):T=>translate(value,language);
