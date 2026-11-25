'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Link2,MessageSquare} from 'lucide-react';
import Markdown from 'react-markdown';
import {active,dateLabel,demoNow,hours,people,priorities,states,type Incident,type Status} from '../../../lib/mock-data';
import {demoMode,getIncident,listIncidents,mockIncidents,updateIncident} from '../../../lib/incidents';
import {Avatar,Panel,Priority,Shell,Status as StatusLabel,url} from '../../ui';
import {Meter,sla} from '../../dashboard';
type Notice={text:string;undo?:()=>void;error?:boolean};
export default function Detail({id,created}:{id:string;created:boolean}){
 const router=useRouter();
 const [items,setItems]=useState<Incident[]>([]);
 const [ready,setReady]=useState(false);
 const [loadError,setLoadError]=useState('');
 const [comment,setComment]=useState('');
 const [note,setNote]=useState('');
 const [notice,setNotice]=useState<Notice|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const composer=useRef<HTMLTextAreaElement>(null);
 const item=items.find(i=>i.id===id);
 const neighbors=items.filter(i=>item&&active(i)===active(item)).sort((a,b)=>Number(b.id.slice(3))-Number(a.id.slice(3)));
 const index=neighbors.findIndex(i=>i.id===id);
 const before=neighbors[index-1];
 const after=neighbors[index+1];
 useEffect(()=>{
  let alive=true;
  setReady(false);
  setLoadError('');
  Promise.all([listIncidents(),demoMode?Promise.resolve(null):getIncident(id)])
   .then(([data,selected])=>{if(alive)setItems(selected?[...data.filter(item=>item.id!==id),selected]:data)})
   .catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:'No se pudo cargar el incidente.')})
   .finally(()=>{if(alive)setReady(true)});
  if(created){setNotice({text:'Incidente '+id+' creado.'});history.replaceState(history.state,'',url(id))}
  return ()=>{alive=false};
 },[id,created]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),6000);return ()=>clearTimeout(timer)},[notice]);
 useEffect(()=>{
  function keys(e:KeyboardEvent){
   if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,dialog'))return;
   if(e.key==='j'&&after)router.push(url(after.id));
   if(e.key==='k'&&before)router.push(url(before.id));
  }
  window.addEventListener('keydown',keys);return ()=>window.removeEventListener('keydown',keys);
 },[after,before,router]);
 if(!item)return <Shell title={id} view="activos" items={items}><div className="panel empty"><h1>{loadError|| (ready?'Incidente no encontrado':'Cargando incidente…')}</h1>{ready&&<Link className="btn mt-4" href="/incidentes">Volver a incidentes</Link>}</div></Shell>;
 const incident=item;
 const stage=states.indexOf(item.status);
 const target=hours[priorities.indexOf(item.priority)];
 const objective=sla(item);
 const actionText=active(item)?'Marcar como resuelto':'Reabrir incidente';
 function store(next:Incident[]){mockIncidents.save(next);setItems(next)}
 function update(changes:Partial<Incident>,text:string,event:string,extra?:string){
  if(!demoMode){
   updateIncident(id,changes)
    .then(saved=>{setItems(current=>current.map(i=>i.id===id?saved:i));setNotice({text})})
    .catch(e=>setNotice({text:e instanceof Error?e.message:'No se pudo guardar el cambio.',error:true}));
   return;
  }
  const next={...incident,...changes,updated:demoNow,activity:[...incident.activity,{date:demoNow,text:event},...(extra?[{date:demoNow,text:extra,comment:true}]:[])]};
  try{
   store(mockIncidents.list().map(i=>i.id===id?next:i));
   setNotice({text,undo:()=>{try{store(mockIncidents.list().map(i=>i.id===id?incident:i));setNotice({text:'Cambio deshecho.'})}catch{setNotice({text:'No se pudo deshacer el cambio.',error:true})}}});
  }catch{setNotice({text:'No se pudo guardar el cambio.',error:true})}
 }
 function changeStatus(value:Status){
  if(value===incident.status)return;
  if(value==='Resuelto'){setNote('');dialog.current?.showModal();return}
  update({status:value,resolved:value==='Cerrado'?incident.resolved??demoNow:undefined},'Estado cambiado a «'+value+'».',people[0]+' cambió el estado a '+value+'.');
 }
 function publish(){
  if(!comment.trim())return;
  if(!demoMode){setNotice({text:'Los comentarios requieren un endpoint de FastAPI. No se publicó el comentario.',error:true});return}
  const next={...incident,updated:demoNow,activity:[...incident.activity,{date:demoNow,text:comment.trim(),comment:true}]};
  try{store(mockIncidents.list().map(i=>i.id===id?next:i));setComment('');setNotice({text:'Comentario publicado.'})}catch{setNotice({text:'No se pudo publicar el comentario.',error:true})}
 }
 function assign(value:string){if(value!==incident.assignee)update({assignee:value},value?'Responsable actualizado.':'Incidente sin asignar.',people[0]+(value?' asignó el incidente a '+value+'.':' quitó al responsable.'))}
 function resolution(){changeStatus(active(incident)?'Resuelto':'Abierto')}
 const navigation=<><span className="mono muted">{index+1} de {neighbors.length}</span>{before?<Link className="icon-btn" href={url(before.id)} aria-label="Anterior"><ChevronLeft size={16}/></Link>:<button className="icon-btn" disabled aria-label="Anterior"><ChevronLeft size={16}/></button>}{after?<Link className="icon-btn" href={url(after.id)} aria-label="Siguiente"><ChevronRight size={16}/></Link>:<button className="icon-btn" disabled aria-label="Siguiente"><ChevronRight size={16}/></button>}<button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(location.origin+url(id));setNotice({text:'Enlace copiado al portapapeles.'})}catch{setNotice({text:'No se pudo copiar el enlace.',error:true})}}}><Link2 size={14}/> Copiar enlace</button></>;
 return <Shell title={id} items={items} view="activos" actions={navigation}><div className="space-y-4">
  {!demoMode&&<p className="muted text-xs">Los cambios de estado, prioridad y responsable se guardan en PostgreSQL. Los comentarios requieren un endpoint que aún no está disponible.</p>}
  <header><div className="flex flex-wrap items-center gap-2 mb-2"><Link className="id-chip" href={url(id)}>{id}</Link><Priority value={item.priority}/><span className="muted text-xs">{item.category} · creado por {item.reporter} el {dateLabel(item.created)}</span></div><h1>{item.title}</h1></header>
  <section className="panel"><div className="summary-grid"><div><p className="eyebrow mb-2">Estado</p><strong><StatusLabel value={item.status}/></strong><p className="muted mt-1">Actualizado el {dateLabel(item.updated)}</p></div><div><p className="eyebrow mb-2">Trabajando en ello</p><strong><Avatar name={item.assignee}/></strong><p className="muted mt-1">Equipo Plataforma</p></div><div><p className="eyebrow mb-2">Objetivo de resolución {target?'· '+target+' h':''}</p><strong>{objective.label}</strong><div className="my-2"><Meter item={item}/></div><p className="muted">{objective.due?'Vence el '+dateLabel(objective.due):'Prioridad sin plazo'}</p></div></div>
  <ol className="stepper">{states.map((s,i)=><li key={s} className={i<=stage?'reached':''} aria-current={i===stage?'step':undefined}><i/><span>{s}</span><small>{i===0?dateLabel(item.created):i===2&&item.resolved?dateLabel(item.resolved):i===stage?dateLabel(item.updated):'—'}</small></li>)}</ol></section>
  <div className="columns"><div className="min-w-0 space-y-4"><Panel title="Descripción"><div className="panel-body markdown"><Markdown>{item.description}</Markdown></div></Panel>
  <Panel title="Actividad" action={<span className="muted mono">{item.activity.length} eventos</span>}><div className="panel-body"><ol className="timeline">{item.activity.map((e,i)=><li key={i}><div className={e.comment?'comment-card':''}>{e.comment?<><header><b>{people[0]}</b> comentó · {dateLabel(e.date)}</header><div className="markdown"><Markdown>{e.text}</Markdown></div></>:<>{e.text}<small className="block muted mt-1">{dateLabel(e.date)}</small></>}</div></li>)}</ol><form className="border-t border-slate-100 pt-4" onSubmit={e=>{e.preventDefault();publish()}}><label className="block font-medium mb-2" htmlFor="comment">Añadir comentario</label><textarea id="comment" ref={composer} rows={3} className="w-full" disabled={!demoMode} placeholder={demoMode?'Escribe una actualización para el equipo…':'Comentarios pendientes de endpoint en FastAPI'} value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();publish()}}}/><div className="flex flex-wrap justify-between items-center gap-2 mt-2"><small className="muted">{demoMode?'Markdown admitido · Ctrl ↵ para enviar':'La API todavía no permite guardar comentarios.'}</small><button className="btn primary" disabled={!demoMode||!comment.trim()}>Comentar</button></div></form></div></Panel></div>
  <Panel title="Propiedades"><div className="panel-body" id="propiedades"><button className={'btn w-full '+(active(item)?'success':'')} onClick={resolution}><Check size={15}/>{actionText}</button><div className="grid grid-cols-2 gap-2 my-3"><button className="btn" onClick={()=>assign(people[0])}>Asignarme</button><button className="btn" onClick={()=>composer.current?.focus()}><MessageSquare size={14}/> Comentar</button></div>
  <div className="properties"><label>Estado<select value={item.status} onChange={e=>changeStatus(e.target.value as Status)}>{states.map(s=><option key={s}>{s}</option>)}</select></label><label>Prioridad<select value={item.priority} onChange={e=>{const priority=e.target.value as Incident['priority'];update({priority},'Prioridad actualizada.',people[0]+' cambió la prioridad a '+priority+'.')}}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label><label>Responsable<select value={item.assignee} onChange={e=>assign(e.target.value)}><option value="">Sin asignar</option>{people.map(p=><option key={p}>{p}</option>)}</select></label><div><span>Categoría</span><span>{item.category}</span></div></div>
  <p className="eyebrow mt-5 mb-2">Fechas</p><dl className="dates">{[['Creado',item.created],['Actualizado',item.updated],['Vence objetivo',objective.due],['Resuelto',item.resolved]].map(([label,date])=><div key={label}><dt>{label}</dt><dd>{date?dateLabel(date):label==='Resuelto'?'Pendiente':'—'}</dd></div>)}</dl></div></Panel></div>
  <div className="fixed-actions detail-actions"><button className="btn" onClick={()=>composer.current?.focus()}>Comentar</button><button className={'btn '+(active(item)?'success':'')} onClick={resolution}>{actionText}</button></div>
  <dialog ref={dialog} className="dialog" aria-labelledby="resolution-title"><h2 id="resolution-title">¿Marcar {id} como resuelto?</h2><p className="muted my-3">Podrás reabrirlo si el problema vuelve.</p>{demoMode&&<label className="field">Nota de resolución <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Describe cómo se resolvió (opcional)"/></label>}<form method="dialog" className="mt-4 flex flex-wrap justify-end gap-2"><button className="btn">Cancelar</button><button type="button" className="btn success" onClick={()=>{update({status:'Resuelto',resolved:demoNow},id+' marcado como resuelto.',people[0]+' marcó el incidente como resuelto.',note.trim());dialog.current?.close()}}>Marcar como resuelto</button></form></dialog>
  {notice&&<div className="toast" role={notice.error?'alert':'status'}><span>{notice.text}</span>{notice.undo&&<button onClick={notice.undo}>Deshacer</button>}<button aria-label="Cerrar aviso" onClick={()=>setNotice(null)}>×</button></div>}
 </div></Shell>;
}
