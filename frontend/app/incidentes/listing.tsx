'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Search,SlidersHorizontal,MoreHorizontal} from 'lucide-react';
import {dateLabel,people,priorities,states,type Incident} from '../../lib/mock-data';
import {demoMode,listIncidents,mockIncidents,updateIncident} from '../../lib/incidents';
import {Avatar,Priority,Shell,Status,list,url,views} from '../ui';
const columns=['ID','Incidente','Prioridad','Estado','Responsable','Creado'];
const keyText=(text:string)=>text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
export default function Listing({viewId,searchInitially}:{viewId:string;searchInitially:boolean}){
 const [items,setItems]=useState<Incident[]>([]);
 const [ready,setReady]=useState(false);
 const [loadError,setLoadError]=useState('');
 const [query,setQuery]=useState('');
 const [term,setTerm]=useState('');
 const [filters,setFilters]=useState<string[]>([]);
 const [sort,setSort]=useState({index:5,descending:true});
 const [limit,setLimit]=useState(13);
 const [notice,setNotice]=useState('');
 const search=useRef<HTMLInputElement>(null);
 const rows=useRef<HTMLTableSectionElement>(null);
 useEffect(()=>{let alive=true;setReady(false);listIncidents().then(data=>{if(alive)setItems(data)}).catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:'No se pudieron cargar los incidentes.')}).finally(()=>{if(alive)setReady(true)});if(searchInitially)search.current?.focus();return ()=>{alive=false}},[searchInitially]);
 useEffect(()=>{const timer=setTimeout(()=>{setTerm(query);setLimit(13)},150);return ()=>clearTimeout(timer)},[query]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6000);return ()=>clearTimeout(timer)},[notice]);
 useEffect(()=>{
  function shortcuts(e:KeyboardEvent){
   if(e.key==='Escape')document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(d=>d.open=false);
   if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select'))return;
   if(e.key==='/'){e.preventDefault();search.current?.focus()}
   if(e.key==='j'||e.key==='k'){
    const links=Array.from(rows.current?.querySelectorAll<HTMLAnchorElement>('.incident-title')??[]);
    const index=links.indexOf(document.activeElement as HTMLAnchorElement);
    links[Math.max(0,Math.min(links.length-1,index+(e.key==='j'?1:-1)))]?.focus();
   }
  }
  function close(e:MouseEvent){document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(d=>{if(e.target instanceof Node&&!d.contains(e.target))d.open=false})}
  document.addEventListener('click',close);window.addEventListener('keydown',shortcuts);
  return ()=>{document.removeEventListener('click',close);window.removeEventListener('keydown',shortcuts)};
 },[]);
 const view=views.find(v=>v.id===viewId)??views[0];
 const inView=items.filter(view.matches);
 const relevant=(options:readonly string[],value:string)=>!options.some(o=>filters.includes(o))||filters.includes(value);
 const sorted=inView.filter(i=>keyText([i.id,i.title,i.category,i.assignee].join(' ')).includes(keyText(term.trim()))&&relevant(priorities,i.priority)&&relevant(states,i.status)).sort((a,b)=>{
  const values=(i:Incident)=>[Number(i.id.slice(3)),i.title,priorities.indexOf(i.priority),states.indexOf(i.status),i.assignee,Date.parse(i.created)];
  const left=values(a)[sort.index],right=values(b)[sort.index];
  return (typeof left==='number'&&typeof right==='number'?left-right:String(left).localeCompare(String(right),'es'))*(sort.descending?-1:1)||Date.parse(b.created)-Date.parse(a.created);
 });
 function clear(){setQuery('');setTerm('');setFilters([]);setLimit(13)}
 async function assign(item:Incident){
  if(demoMode){
   const next=items.map(i=>i.id===item.id?{...i,assignee:people[0],activity:[...i.activity,{date:i.updated,text:people[0]+' se asignó el incidente.'}]}:i);
   try{mockIncidents.save(next);setItems(next);setNotice(item.id+' se asignó a '+people[0]+'.')}catch{setNotice('No se pudo guardar la asignación.')}
   return;
  }
  try{
   const updated=await updateIncident(item.id,{assignee:people[0]});
   setItems(current=>current.map(i=>i.id===item.id?updated:i));
   setNotice(item.id+' se asignó a '+people[0]+'.');
  }catch(e){setNotice(e instanceof Error?e.message:'No se pudo guardar la asignación.')}
 }
 function filter(label:string,options:readonly string[],field:'priority'|'status'){
  const selected=options.filter(option=>filters.includes(option)).length;
  return <details className="popover"><summary className={'btn '+(selected?'selected':'')}><SlidersHorizontal size={13}/>{label}{selected>0&&<span className="count">{selected}</span>}</summary><div className="popover-body">{options.map(option=><label key={option}><input type="checkbox" checked={filters.includes(option)} onChange={e=>{setLimit(13);setFilters(e.target.checked?[...filters,option]:filters.filter(f=>f!==option))}}/>{option}<span className="mono muted ml-auto">{inView.filter(i=>i[field]===option).length}</span></label>)}</div></details>;
 }
 return <Shell items={items} view={view.id} title="Incidentes">{loadError&&<div className="error-banner mb-4" role="alert">{loadError}</div>}<h1>Incidentes</h1><p className="muted mt-1 mb-5">Todo lo que el equipo está registrando, priorizando y resolviendo.</p>
 <nav className="tabs" aria-label="Vistas de incidentes">{views.filter(v=>v.id!=='mios'||view.id==='mios').map(v=><Link key={v.id} href={list(v.id)} aria-current={v.id===view.id?'page':undefined} onClick={clear}>{v.label} <span className="count">{items.filter(v.matches).length}</span></Link>)}</nav>
 <div className="toolbar"><label className="search"><Search size={15}/><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar incidentes…" aria-label="Buscar incidentes"/><kbd>/</kbd></label>{filter('Prioridad',priorities,'priority')}{filter('Estado',states,'status')}{(query||filters.length>0)&&<button className="btn" onClick={clear}>Limpiar filtros</button>}<span className="ml-auto muted text-xs">Ordenado por <b>{sort.index===5?'fecha de creación':columns[sort.index].toLowerCase()} {sort.descending?'↓':'↑'}</b></span></div>
 <section className="panel"><div className="table-scroll"><table className="incident-table full"><thead><tr>{columns.map((label,index)=><th key={label} aria-sort={sort.index===index?(sort.descending?'descending':'ascending'):'none'}><button onClick={()=>setSort({index,descending:sort.index===index?!sort.descending:index===0||index===5})}>{label} {sort.index===index&&<span className="text-[#3867d6]">{sort.descending?'↓':'↑'}</span>}</button></th>)}<th aria-label="Acciones"/></tr></thead>
 <tbody ref={rows}>{sorted.slice(0,limit).map(i=><tr key={i.id}><td><Link className="id-chip" href={url(i.id)}>{i.id}</Link></td><td><Link className="incident-title" href={url(i.id)}>{i.title}</Link><span className="muted text-xs ml-2">{i.category}</span></td><td><Priority value={i.priority}/></td><td><Status value={i.status}/></td><td><Avatar name={i.assignee}/></td><td className="muted">{dateLabel(i.created)}</td><td><button className="icon-btn" aria-label={'Acciones de '+i.id} onClick={()=>{const menu=document.getElementById('menu-'+i.id) as HTMLDialogElement;menu.showModal()}}><MoreHorizontal size={16}/></button><dialog id={'menu-'+i.id} className="dialog"><h2 className="mb-3">Acciones de {i.id}</h2><div className="grid gap-2"><Link className="btn" href={url(i.id)}>Abrir incidente</Link><button className="btn" onClick={()=>{assign(i);(document.getElementById('menu-'+i.id) as HTMLDialogElement).close()}}>Asignarme</button><Link className="btn" href={url(i.id)+'#propiedades'}>Cambiar estado o prioridad</Link><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+url(i.id));setNotice('Enlace copiado al portapapeles.')}catch{setNotice('No se pudo copiar el enlace.')}(document.getElementById('menu-'+i.id) as HTMLDialogElement).close()}}>Copiar enlace</button><form method="dialog"><button className="btn w-full">Cerrar</button></form></div></dialog></td></tr>)}</tbody></table></div>
 {!ready?<p className="empty" role="status">Cargando incidentes…</p>:sorted.length===0?<div className="empty"><h2>{term?'Ningún incidente coincide con «'+term+'»':'Nada pendiente en «'+view.label+'»'}</h2><p className="muted my-2">Prueba con otra búsqueda o revisa los incidentes activos.</p>{term||filters.length?<button className="btn" onClick={clear}>Limpiar búsqueda y filtros</button>:<Link className="btn" href={list()}>Ver incidentes activos</Link>}</div>:<footer className="panel-head"><span className="muted">{term||filters.length?sorted.length+' resultados en '+view.label.toLowerCase():'Mostrando '+Math.min(limit,sorted.length)+' de '+sorted.length}</span>{limit<sorted.length&&<button className="btn" onClick={()=>setLimit(limit+16)}>Cargar {Math.min(16,sorted.length-limit)} más</button>}</footer>}
 </section>{notice&&<div className="toast" role="status">{notice}<button aria-label="Cerrar aviso" onClick={()=>setNotice('')}>×</button></div>}</Shell>;
}
