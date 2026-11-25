'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useState,type ReactNode} from 'react';
import {LayoutDashboard,List,UserRound,Plus,Menu,Search,ChevronDown,Settings} from 'lucide-react';
import {active,people,priorities,colors,states,type Incident} from '../lib/mock-data';
export const url=(id:string)=>'/incidentes/'+id;
export const views=[
 {id:'activos',label:'Activos',matches:active},
 {id:'criticos',label:'Críticos',matches:(i:Incident)=>active(i)&&i.priority==='Crítica'},
 {id:'sin-asignar',label:'Sin asignar',matches:(i:Incident)=>active(i)&&!i.assignee},
 {id:'resueltos',label:'Resueltos',matches:(i:Incident)=>!active(i)},
 {id:'mios',label:'Asignados a mí',matches:(i:Incident)=>active(i)&&i.assignee===people[0]},
];
export const list=(view='activos')=>'/incidentes?vista='+view;
export function Panel({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}){
 return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function Priority({value}:{value:Incident['priority']}){
 return <span className={'priority '+(value==='Crítica'?'critical':'')}><i style={{background:colors[priorities.indexOf(value)]}}/>{value}</span>;
}
export function Status({value}:{value:Incident['status']}){
 return <span className="status"><i style={{color:['#64748b','#3867d6','#2e8b57','#475569'][states.indexOf(value)]}}>{['○','◐','✓','●'][states.indexOf(value)]}</i>{value}</span>;
}
export function Avatar({name}:{name:string}){
 return <span className="assignee"><span className={name?'avatar':'unassigned'}>{name.split(' ').map(word=>word[0]).slice(0,2).join('')}</span>{name||'Sin asignar'}</span>;
}
function Logo(){return <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect width="26" height="26" rx="6" fill="#142945"/><ellipse cx="9.4" cy="11" rx="5.2" ry="3.1" transform="rotate(35 9.4 11)" fill="#7fa2f0"/><ellipse cx="16.6" cy="11" rx="5.2" ry="3.1" transform="rotate(-35 16.6 11)" fill="#3867d6"/><circle cx="13" cy="16.6" r="2.3" fill="white"/></svg>}
export function Shell({items,view,title,children,actions}:{items:Incident[];view:string;title:string;children:ReactNode;actions?:ReactNode}){
 const path=usePathname();
 const router=useRouter();
 const [menu,setMenu]=useState(false);
 useEffect(()=>{
  function shortcuts(event:KeyboardEvent){
   if(event.key==='Escape') setMenu(false);
   if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable],dialog')) return;
   if(event.key.toLowerCase()==='c'&&!event.metaKey&&!event.ctrlKey&&path!=='/incidentes/nuevo') router.push('/incidentes/nuevo');
   if(event.key.toLowerCase()==='k'&&(event.metaKey||event.ctrlKey)&&path==='/'){event.preventDefault();router.push('/incidentes?buscar=1');}
  }
  window.addEventListener('keydown',shortcuts);
  return ()=>window.removeEventListener('keydown',shortcuts);
 },[path,router]);
 function nav(index:number,icon:ReactNode){
  const item=views[index];
  return <Link className="nav" href={list(item.id)} onClick={()=>setMenu(false)} aria-current={path==='/incidentes'&&view===item.id?'page':undefined}>{icon}<span>{index===0?'Incidentes':item.label}</span><span className="ml-auto mono">{items.filter(item.matches).length}</span></Link>;
 }
 return <div className="flex min-h-screen">
  {menu&&<button className="drawer-scrim" aria-label="Cerrar menú" onClick={()=>setMenu(false)}/>}
  <aside className={'sidebar '+(menu?'open':'')}>
   <Link href="/" className="flex items-center gap-2 px-2 text-[15px] font-semibold text-white" onClick={()=>setMenu(false)}><Logo/>BugFly</Link>
   <div className="team"><span>P</span> Equipo Plataforma <ChevronDown size={13} className="ml-auto"/></div>
   <nav aria-label="Navegación principal" className="space-y-0.5">
    <Link className="nav" href="/" aria-current={path==='/'?'page':undefined} onClick={()=>setMenu(false)}><LayoutDashboard size={15}/> Panel</Link>
    {nav(0,<List size={15}/>)}{nav(4,<UserRound size={15}/>)}
    <p className="eyebrow px-2 pt-5 pb-2 text-[#8796ae]">Vistas</p>
    {nav(1,<span className="signal"/>)}{nav(2,<span className="unassigned"/>)}
   </nav>
   <div className="mt-auto space-y-3"><div className="flex items-center gap-2 px-2 text-[#a9b6cc]"><Settings size={15}/> Configuración</div><div className="border-t border-[#1c3456] px-2 pt-3 text-white"><Avatar name={people[0]}/><div className="ml-7 text-xs text-[#a9b6cc]">Líder técnica</div></div></div>
  </aside>
  <div className="min-w-0 flex-1">
   <header className="topbar"><div className="flex items-center gap-2"><span className="muted">Plataforma</span><span className="muted">/</span>{path.startsWith('/incidentes/')&&<><Link href="/incidentes">Incidentes</Link><span className="muted">/</span></>}<span className="font-medium">{title}</span></div><div className="flex items-center gap-2">{actions ?? <>{path==='/'&&<Link className="btn" href="/incidentes?buscar=1"><Search size={14}/> Buscar <kbd>Ctrl K</kbd></Link>}{path!=='/incidentes/nuevo'&&<Link className="btn primary" href="/incidentes/nuevo"><Plus size={14}/> Nuevo incidente <kbd>C</kbd></Link>}</>}</div></header>
   <header className="mobilebar"><Link href={path.startsWith('/incidentes/')?'/incidentes':'/'} aria-label={path.startsWith('/incidentes/')?'Atrás':'Panel'}><Logo/></Link><strong>{title}</strong><div className="flex">{path!=='/incidentes/nuevo'&&<Link href="/incidentes/nuevo" aria-label="Nuevo incidente"><Plus size={20}/></Link>}<button aria-expanded={menu} aria-label="Abrir menú" onClick={()=>setMenu(!menu)}><Menu size={20}/></button></div></header>
   <main className="content">{children}</main>
  </div>
 </div>;
}
