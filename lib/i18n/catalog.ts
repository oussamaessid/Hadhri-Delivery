export type Locale='fr';
export type Translation={name?:string;description?:string;detail?:string};
export type Translatable={name:string;nameArabic?:string;description?:string;detail?:string;translations?:Partial<Record<Locale,Translation>>;variants?:{id:string;name:string;price:number;translations?:Partial<Record<Locale,Translation>>}[]};
export function resolveLocale(_input:unknown):Locale {return 'fr'}
export function localizedText(value:string,_lang:Locale){return value}
export function localizeEntity<T extends Translatable>(row:T,lang:Locale):T {
 const result={...row};
 for(const field of ['name','description','detail'] as const){const original=row[field];if(typeof original==='string')result[field]=row.translations?.[lang]?.[field] || original}
 if(row.variants)result.variants=row.variants.map(v=>({...v,name:v.translations?.[lang]?.name||v.name}));
 return result;
}
export function localizeState<T extends {catalog:Record<string,Translatable[]>;orders:unknown[]}>(state:T,lang:Locale):T {
 const catalog={...state.catalog};for(const key of ['restaurants','departments','categories','products'])catalog[key]=(catalog[key]||[]).map(row=>localizeEntity(row,lang));
 const merchants=new Map(catalog.restaurants.map(x=>[(x as Translatable&{id:string}).id,x.name]));
 const categories=new Map(catalog.categories.map(x=>[(x as Translatable&{id:string}).id,x.name]));
 for(const key of ['categories','products'])catalog[key]=catalog[key].map(row=>{const r=row as Translatable&{merchantId?:string;categoryId?:string};return {...r,...(r.merchantId?{merchant:merchants.get(r.merchantId)}:{}),...(r.categoryId?{category:categories.get(r.categoryId)}:{})}});
 const orders=state.orders.map(order=>{if(!order||typeof order!=='object')return order;const row=order as Record<string,unknown>;return {...row,...(typeof row.merchant==='string'?{merchant:localizedText(row.merchant,lang)}:{}),...(Array.isArray(row.items)?{items:row.items.map(item=>typeof item.name==='string'?{...item,name:localizedText(item.name,lang)}:item)}:{})}});
 return {...state,catalog,orders};
}
export function seedEntityTranslations<T extends Translatable>(row:T):T {
 const translations={...row.translations};
 const entry={...(translations['fr']||{})};
 for(const field of ['name','description','detail'] as const){const value=row[field];if(value&&!entry[field])entry[field]=value}
 translations['fr']=entry;
 return {...row,translations};
}
