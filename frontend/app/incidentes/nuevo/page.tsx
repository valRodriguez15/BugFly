'use client';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {categories,colors,hours,people,type Draft,type Incident,type Priority} from '../../../lib/mock-data';
import {createIncident,demoMode,listIncidents} from '../../../lib/incidents';
import {Panel,Priority as Badge,Shell,url} from '../../ui';
const initial:Draft={title:'',description:'',category:'',priority:'Media',status:'Abierto',assignee:''};
const choices:Priority[]=['Crítica','Alta','Media','Baja'];
const impacts=['Servicio caído o datos en riesgo','Funcionalidad clave degradada','Afecta a una parte del producto','Molestia menor o cosmética'];
const template=['**Qué pasa**','','**Dónde y desde cuándo**','','**Pasos para reproducir**','1.','2.','','**Resultado esperado**'].join('\n');
export default function Page(){
 const router=useRouter();
 const [items,setItems]=useState<Incident[]>([]);
 const [draft,setDraft]=useState(initial);
 const [touched,setTouched]=useState<string[]>([]);
 const [submitted,setSubmitted]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const form=useRef<HTMLFormElement>(null);
 const discard=useRef<HTMLDialogElement>(null);
 const dirty=Object.keys(initial).some(k=>initial[k as keyof Draft]!==draft[k as keyof Draft]);
 useEffect(()=>{let alive=true;listIncidents().then(data=>{if(alive)setItems(data)}).catch(()=>{});return ()=>{alive=false}},[]);
 useEffect(()=>{
  function beforeUnload(e:BeforeUnloadEvent){if(dirty&&!saving){e.preventDefault();e.returnValue=true}}
  function shortcut(e:KeyboardEvent){
   if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!discard.current?.open){e.preventDefault();form.current?.requestSubmit()}
   if(e.key==='Escape'&&!discard.current?.open&&!saving){e.preventDefault();if(dirty)discard.current?.showModal();else router.push('/incidentes')}
  }
  window.addEventListener('beforeunload',beforeUnload);window.addEventListener('keydown',shortcut);
  return ()=>{window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('keydown',shortcut)};
 },[dirty,saving,router]);
 const errors={title:draft.title.trim().length<8?(draft.title.trim()?'El título es demasiado corto: usa al menos 8 caracteres.':'Escribe un título para el incidente.'):'',description:draft.description.trim().length<20?(draft.description.trim()?'Amplía un poco la descripción (mínimo 20 caracteres).':'Añade una descripción para que el responsable tenga contexto.'):'',category:!demoMode||draft.category?'':'Elige una categoría.',assignee:!draft.assignee?(draft.priority==='Crítica'?'Los incidentes críticos necesitan un responsable desde el inicio.':draft.status==='En progreso'?'Para marcarlo «En progreso» asigna a alguien.':''):''};
 const invalid=Object.entries(errors).filter(([,message])=>message);
 const fieldError=(field:keyof typeof errors)=>submitted||touched.includes(field)?errors[field]:'';
 const touch=(key:string)=>setTouched(old=>old.includes(key)?old:[...old,key]);
 const change=<K extends keyof Draft>(key:K,value:Draft[K])=>setDraft(old=>({...old,[key]:value}));
 const help=(key:keyof typeof errors, fallback:string)=><small id={key+'-help'} className={fieldError(key)?'field-error':'muted'}>{fieldError(key)||fallback}</small>;
 const props=(key:keyof typeof errors)=>({id:key,name:key,'aria-invalid':!!fieldError(key),'aria-describedby':key+'-help',onBlur:()=>touch(key)});
 async function submit(e:FormEvent){
  e.preventDefault();if(saving)return;
  setSubmitted(true);setError('');
  if(invalid.length){form.current?.querySelector<HTMLElement>('#'+invalid[0][0])?.focus();return}
  setSaving(true);
  try{
   const id=await createIncident({...draft,title:draft.title.trim(),description:draft.description.trim()});
   router.push(url(id)+'?creado=1');
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el incidente. Inténtalo de nuevo.');setSaving(false)}
 }
 const needsOwner=draft.priority==='Crítica'||draft.status==='En progreso';
 const workload=items.filter(i=>i.assignee===draft.assignee&&(i.status==='Abierto'||i.status==='En progreso')).length;
 return <Shell items={items} view="activos" title="Nuevo incidente"><p className="eyebrow mb-2">{demoMode?'Se creará como '+('BF-'+(1+Math.max(1087,...items.map(item=>Number(item.id.slice(3)))))):'El ID se asignará al guardar en PostgreSQL'}</p><h1 className="mb-5">Nuevo incidente</h1>{!demoMode&&<p className="muted text-xs mb-4">La API actual guarda título, descripción, prioridad y responsable. La categoría y el estado inicial no se pueden modificar desde este formulario hasta que el backend los admita.</p>}
 {(error||(submitted&&invalid.length>0))&&<div className="error-banner mb-4" role="alert">{error||'Revisa '+invalid.length+' '+(invalid.length===1?'campo':'campos')+' antes de crear el incidente.'}</div>}
 <form ref={form} onSubmit={submit} noValidate><fieldset disabled={saving} className="columns">
 <Panel title="Contenido"><div className="panel-body space-y-5"><div className="field"><label htmlFor="title">Título <span>*</span><small className={'mono ml-auto '+(draft.title.length>110?'text-amber-700':'muted')}>{draft.title.length}/{demoMode?120:100}</small></label><input {...props('title')} required maxLength={demoMode?120:100} className="title-input" placeholder="Ej. Error intermitente en la API de pagos" value={draft.title} onChange={e=>change('title',e.target.value)}/>{help('title','Describe el síntoma que se observa, no la causa que sospechas.')}</div>
 <div className="field"><div className="flex items-center justify-between"><label htmlFor="description">Descripción <span>*</span></label><button className="text-[#3867d6] font-medium" type="button" disabled={!!draft.description.trim()} onClick={()=>change('description',template)}>Usar plantilla</button></div><textarea {...props('description')} required className="description-input" placeholder="Describe qué ocurre y cómo reproducirlo…" value={draft.description} onChange={e=>change('description',e.target.value)}/>{help('description','Admite Markdown. Incluye enlaces a logs o dashboards si los tienes.')}</div></div></Panel>
 <Panel title="Propiedades"><div className="panel-body space-y-5"><fieldset className="space-y-2"><legend className="font-medium mb-2">Prioridad <span className="text-red-700">*</span></legend>{choices.map((priority,i)=><label className={'radio-card '+(draft.priority===priority?'selected':'')} key={priority}><input type="radio" name="priority" checked={draft.priority===priority} onChange={()=>change('priority',priority)} style={{accentColor:colors[i]}}/><div className="flex-1"><div className="flex justify-between gap-2"><Badge value={priority}/><small className="mono muted">{hours[i]===null?'Sin objetivo':hours[i]!>=24?hours[i]!/24+' d':hours[i]+' h'}</small></div><small className="muted">{impacts[i]}</small></div></label>)}</fieldset>
 <div className="field"><label htmlFor="category">Categoría {demoMode&&<span>*</span>}</label><select {...props('category')} required={demoMode} disabled={!demoMode} value={draft.category} onChange={e=>{change('category',e.target.value);touch('category')}}><option value="">{demoMode?'Elige una categoría':'No disponible en la API actual'}</option>{categories.map(c=><option key={c}>{c}</option>)}</select>{help('category','')}</div>
 <div className="field"><div className="flex justify-between"><label htmlFor="assignee">Responsable {needsOwner&&<span>*</span>}</label><button type="button" className="text-[#3867d6] font-medium" onClick={()=>change('assignee',people[0])}>Asignarme</button></div><select {...props('assignee')} required={needsOwner} value={draft.assignee} onChange={e=>{change('assignee',e.target.value);touch('assignee')}}><option value="">Sin asignar</option>{people.map(p=><option key={p}>{p}</option>)}</select>{help('assignee',draft.assignee?draft.assignee.split(' ')[0]+' tiene '+workload+' incidentes activos.':'Puedes dejarlo sin asignar y repartirlo después.')}</div>
 <div className="field"><span className="font-medium">Estado inicial</span><div className="segments self-start">{(['Abierto','En progreso'] as const).map(s=><button key={s} type="button" aria-pressed={s===draft.status} onClick={()=>change('status',s)} disabled={!demoMode&&s!=='Abierto'}>{s}</button>)}</div><small className="muted">En progreso indica que alguien ya está trabajando en él.</small></div>
 </div></Panel>
 </fieldset><footer className="fixed-actions"><span className="muted">Ctrl ↵ para crear · Esc para cancelar</span><div className="flex gap-2"><button className="btn" type="button" disabled={saving} onClick={()=>dirty?discard.current?.showModal():router.push('/incidentes')}>Cancelar</button><button className="btn primary" disabled={saving}>{saving?'Creando…':'Crear incidente'}</button></div></footer></form>
 <dialog ref={discard} className="dialog" role="alertdialog" aria-labelledby="discard-title"><h2 id="discard-title">¿Descartar este incidente?</h2><p className="muted my-3">Perderás el título, la descripción y las propiedades que configuraste.</p><form method="dialog" className="flex justify-end gap-2"><button className="btn" autoFocus>Seguir editando</button><button className="btn danger" type="button" onClick={()=>router.push('/incidentes')}>Descartar</button></form></dialog>
 </Shell>;
}
