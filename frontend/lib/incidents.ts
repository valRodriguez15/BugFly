import {type Draft, type Incident, seed, people, demoNow, priorities, states, type Priority, type Status} from './mock-data';

const key = 'bugfly:incidentes:v1';
export const demoMode = process.env.NEXT_PUBLIC_BUGFLY_MODE === 'demo';

export const mockIncidents = {
 list(): Incident[] {
  try { const stored=localStorage.getItem(key); return stored ? JSON.parse(stored) : seed; } catch { return seed; }
 },
 save(items:Incident[]) { localStorage.setItem(key, JSON.stringify(items)); },
 nextId(items:Incident[]) { return 'BF-'+(1+Math.max(1087,...items.map(item=>Number(item.id.slice(3))))); },
 create(draft:Draft,items:Incident[]):Incident {
  return {...draft,id:this.nextId(items),created:demoNow,updated:demoNow,reporter:people[0],activity:[{text:people[0]+' creó el incidente.',date:demoNow}]};
 },
};

export type ApiDraft = { titulo:string; descripcion:string; gravedad:Priority; responsable:string|null };
export type ApiIncident = {
 id:number; titulo:string; descripcion:string|null; gravedad:Priority;
 responsable:string|null; estado:Status; fecha_creacion:string; fecha_actualizacion:string;
};
export type ApiStatistics = {
 total:number; por_estado:Record<Status,number>; por_gravedad:Record<Priority,number>;
};
type ApiUpdate = Partial<Pick<ApiIncident,'titulo'|'descripcion'|'gravedad'|'responsable'|'estado'>>;

async function apiRequest<T>(path:string,init:RequestInit = {}):Promise<T> {
 let response:Response;
 try {
  response=await fetch('/api/bugfly/'+path,{...init,cache:'no-store',headers:{Accept:'application/json',...init.headers}});
 } catch {
  throw new Error('No se pudo conectar con FastAPI. Comprueba que el servicio esté iniciado.');
 }
 if(!response.ok){
  let detail='';
  try {const body=await response.json(); if(typeof body.detail==='string')detail=' '+body.detail;} catch {}
  throw new Error('FastAPI respondió con el código '+response.status+'.'+detail);
 }
 try{return await response.json() as T}
 catch{throw new Error('La respuesta de FastAPI no es JSON válido.')}
}

function fromApi(record:ApiIncident):Incident {
 const priority=priorities.includes(record.gravedad as Priority)?record.gravedad as Priority:'Media';
 const status=states.includes(record.estado as Status)?record.estado as Status:'Abierto';
 return {
  id:'BF-'+record.id,
  title:record.titulo,
  description:record.descripcion??'',
  category:'Sin categoría',
  priority,status,
  assignee:record.responsable??'',
  reporter:'',
  created:record.fecha_creacion??'',
  updated:record.fecha_actualizacion??record.fecha_creacion??'',
  activity:[],
 };
}

function numericId(id:string):number {
 const number=Number(id.replace(/^BF-/,''));
 if(!Number.isInteger(number)||number<1)throw new Error('Identificador de incidente inválido.');
 return number;
}

export async function listIncidents():Promise<Incident[]> {
 if(demoMode)return mockIncidents.list();
 const records=await apiRequest<ApiIncident[]>('incidentes');
 if(!Array.isArray(records))throw new Error('FastAPI devolvió una lista de incidentes inválida.');
 return records.map(fromApi);
}

export async function getIncident(id:string):Promise<Incident> {
 if(demoMode){
  const found=mockIncidents.list().find(i=>i.id===id);
  if(!found)throw new Error('Incidente no encontrado.');
  return found;
 }
 return fromApi(await apiRequest<ApiIncident>('incidentes/'+numericId(id)));
}

export async function createIncident(draft:Draft):Promise<string> {
 if(demoMode){
  const current=mockIncidents.list();
  const incident=mockIncidents.create(draft,current);
  mockIncidents.save([incident,...current]);
  return incident.id;
 }
 const payload:ApiDraft={
  titulo:draft.title.trim(),
  descripcion:draft.description.trim(),
  gravedad:draft.priority,
  responsable:draft.assignee||null,
 };
 const created=await apiRequest<ApiIncident>('incidentes',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
 if(!Number.isInteger(created.id))throw new Error('FastAPI no devolvió el ID del incidente creado.');
 return 'BF-'+created.id;
}

export async function updateIncident(id:string,changes:Partial<Incident>):Promise<Incident> {
 const payload:ApiUpdate={};
 if(changes.title!==undefined)payload.titulo=changes.title;
 if(changes.description!==undefined)payload.descripcion=changes.description;
 if(changes.priority!==undefined)payload.gravedad=changes.priority;
 if(changes.status!==undefined)payload.estado=changes.status;
 if(changes.assignee!==undefined)payload.responsable=changes.assignee||null;
 if(!Object.keys(payload).length)throw new Error('No hay cambios que guardar.');
 const updated=await apiRequest<ApiIncident>('incidentes/'+numericId(id),{
  method:'PATCH',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload),
 });
 return fromApi(updated);
}

export async function getStatistics():Promise<ApiStatistics> {
 return apiRequest<ApiStatistics>('estadisticas');
}

export async function checkHealth():Promise<boolean> {
 const data=await apiRequest<{status:string;base_de_datos:string}>('health');
 return data.status==='ok'&&data.base_de_datos==='conectada';
}
