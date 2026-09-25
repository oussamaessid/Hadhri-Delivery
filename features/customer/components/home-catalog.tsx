'use client';
import {t,useLanguage} from "@/lib/i18n/react";

/* eslint-disable @next/next/no-img-element */
import {homeDepartments,departmentImage,restaurantImage} from '../services/department-images';
import {Minus,Plus,Search} from 'lucide-react';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {type DemoState,type Entity,money} from '../../admin/data/demo';
import {type CartLine} from '../services/checkout';
export function HomeCatalog({loyalty,state,query,setQuery,openMerchant,add,reduce,lines,ready,requestedDepartment,setDepartment}:{requestedDepartment:string;setDepartment:(value:string)=>void;state:DemoState;query:string;setQuery:(value:string)=>void;openMerchant:(merchant:Entity)=>void;add:(product:Entity)=>void;reduce:(id:string,change:number,variant?:string)=>void;lines:CartLine[];ready:boolean;loyalty?:ReactNode}){
 useLanguage();

 const departments=homeDepartments(state.catalog.departments||[]);
 const department=departments.some(d=>d.id===requestedDepartment)?requestedDepartment:departments[0]?.id||'';
 const selected=departments.find(d=>d.id===department);
 const resultsRef=useRef<HTMLDivElement>(null);
 const scrollToResults=useRef(false);
 useLayoutEffect(()=>{
  if(!scrollToResults.current||!resultsRef.current)return;
  scrollToResults.current=false;
  const headerHeight=document.querySelector('.customer-header')?.getBoundingClientRect().height||0;
  const top=window.scrollY+resultsRef.current.getBoundingClientRect().top-headerHeight-16;
  window.scrollTo({top:Math.max(0,top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[requestedDepartment]);
 const selectDepartment=(value:string)=>{scrollToResults.current=true;setDepartment(value)};
 const matches=(text:string)=>text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 const restaurants=state.catalog.restaurants.filter(m=>!m.id.startsWith('shop-')).filter(m=>matches([m.name,...state.catalog.products.filter(p=>p.merchantId===m.id).map(p=>p.name)].join(' ')));
 const merchants=state.catalog.restaurants;
 const products=state.catalog.products.filter(p=>{
  const category=state.catalog.categories.find(c=>c.id===p.categoryId);
  return (category?.department===department||(department==='restaurants'&&!!query.trim()&&!!category?.department))&&category.status==='ACTIVE'&&matches(p.name+' '+(p.description||'')+' '+(p.merchant||''));
 });

 return <>
 <section className={"hd-hero"+(loyalty?" has-loyalty":"")}><div className="hd-hero-content"><span className="section-kicker">{t("HADHRI DELIVERY · MONASTIR")}</span><h1>{t("Livraison à Monastir")}<em>{t("vos envies, chez vous.")}</em></h1><label className="customer-search hd-search"><Search size={20}/><input aria-label={t("Rechercher un restaurant ou un produit")} placeholder={t("Un restaurant, un produit…")} value={query} onChange={e=>setQuery(e.target.value)}/></label></div>{loyalty}</section>
 <section className="home-departments" aria-label={t("Nos rayons")}><div className="department-section-title"><span className="section-kicker">{t("À DÉCOUVRIR")}</span><h2>{t("De quoi avez-vous envie ?")}</h2></div><Tabs dir="ltr" value={department} onValueChange={selectDepartment} className="department-tabs"><TabsList aria-label={t("Choisir un rayon")}>{t(departments.map(d=><TabsTrigger value={d.id} key={d.id} aria-label={t(d.name)}><span className="department-visual"><img src={departmentImage(d)} alt={t(d.name)} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=departmentImage({id:d.id})}}/></span><span className="department-name">{t(d.detail||d.name)}</span></TabsTrigger>))}</TabsList></Tabs></section>
 <div ref={resultsRef} className="store-section-heading"><h2>{t(department==='restaurants'?'Nos restaurants':selected?.name||'Nos rayons')}</h2><span>{t(department==='restaurants'?restaurants.length+' restaurants':products.length+' produits')}</span></div>
 {t(department==='restaurants'?<div className="restaurant-grid">{t(restaurants.map(m=><button className="restaurant-card" key={m.id} disabled={m.status!=='ACTIVE'} aria-label={t(m.name+(m.status!=='ACTIVE'?' — indisponible':''))} onClick={()=>openMerchant(m)}><div className="restaurant-image"><img src={restaurantImage(m)} alt={t(m.name)} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=restaurantImage({name:m.name})}}/></div><h3>{t(m.name)}</h3></button>))}</div>:null)}{t((department!=='restaurants'||(!!query.trim()&&products.length>0))&&<>{t(department==='restaurants'&&<div className="store-section-heading search-products-heading"><h2>{t("Produits")}</h2><span>{t(products.length)}{t(" résultats")}</span></div>)}<div className="department-products">{t(products.map(p=>{const line=lines.find(l=>l.productId===p.id);const quantity=lines.filter(l=>l.productId===p.id).reduce((sum,l)=>sum+l.quantity,0);const merchant=merchants.find(m=>m.id===p.merchantId);const available=p.status==='ACTIVE'&&(p.stock||0)>quantity&&merchant?.status==='ACTIVE';return <article className="department-product" key={p.id}><div className="department-product-image"><img src={p.image||departmentImage(selected)} alt={t(p.name)} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=departmentImage(selected)}}/></div><div className="department-product-info"><small>{t(merchant?.name)}</small><h3>{t(p.name)}</h3><div><strong>{t(money(p.value))}</strong>{t(quantity>0?<div className="quantity-control add-product-stepper"><button type="button" aria-label={t('Réduire '+p.name)} onClick={()=>reduce(p.id,-1,line?.variantId)}><Minus size={15}/></button><b>{t(quantity)}</b><button type="button" aria-label={t('Augmenter '+p.name)} disabled={!ready||!available} onClick={()=>reduce(p.id,1,line?.variantId)}><Plus size={15}/></button></div>:<button className="add-product" disabled={!ready||!available} aria-label={t('Ajouter '+p.name)} onClick={()=>add(p)}><Plus size={18}/></button>)}</div>{t(!available&&<small>{t("Indisponible")}</small>)}</div></article>}))}</div></>)}
 {t(((department==='restaurants'&&!restaurants.length&&(!query.trim()||!products.length))||(department!=='restaurants'&&!products.length))&&<div className="customer-empty"><h2>{t(query?'Aucun résultat':'Les articles arrivent bientôt')}</h2>{t(query&&<button className="customer-secondary" onClick={()=>setQuery('')}>{t("Effacer la recherche")}</button>)}</div>)}
 </>;
}
