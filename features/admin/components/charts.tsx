'use client';
import {t,useLanguage} from "@/lib/i18n/react";

import {ResponsiveContainer,AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,BarChart,Bar} from 'recharts';
export function RevenueChart({data,metric='Revenus'}:{data:{name:string;Commandes:number;Revenus:number}[];metric?:'Revenus'|'Commandes'}){
 useLanguage();
return <div className="chart" role="img" aria-label={t(`Graphique ${metric} par période`)}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:12,right:12,left:0,bottom:0}}><defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6460e8" stopOpacity={.24}/><stop offset="100%" stopColor="#6460e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#eceef4"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#8a91a2',fontSize:12}} minTickGap={20}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#8a91a2',fontSize:12}} width={45}/><Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8eaf1'}}/><Area type="monotone" dataKey={metric} stroke="#6661e9" strokeWidth={3} fill="url(#revenue-fill)"/></AreaChart></ResponsiveContainer></div>}
export function SmallBars({data}:{data:{name:string;value:number}[]}){
 useLanguage();
return <div className="chart small" role="img" aria-label={t("Répartition par catégorie")}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid vertical={false} stroke="#eceef4"/><XAxis dataKey="name" tick={{fontSize:12}} axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} width={25}/><Tooltip/><Bar dataKey="value" name="Total" fill="#7772ee" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>}
