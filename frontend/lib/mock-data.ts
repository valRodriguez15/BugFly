export const people = ['Camila Torres', 'Mariana Ortiz', 'Andrés Rueda', 'Lucía Herrera', 'Diego Patiño'];
export const categories = ['Backend','Frontend','Infraestructura','Integraciones','Datos','Seguridad'];
export const priorities = ['Crítica','Alta','Media','Baja'] as const;
export const states = ['Abierto','En progreso','Resuelto','Cerrado'] as const;
export const colors = ['#d33a3a','#e07b24','#c9a227','#94a3b8'];
export const hours = [4,24,72,null];
export type Priority = typeof priorities[number];
export type Status = typeof states[number];
export type Draft = { title:string; description:string; category:string; priority:Priority; status:Status; assignee:string };
export type Activity = { text:string; date:string; comment?:boolean };
export type Incident = Draft & { id:string; created:string; updated:string; resolved?:string; reporter:string; activity:Activity[] };
export const demoNow = '2026-11-09T21:09:00';
export const active = (item:Incident) => states.indexOf(item.status) < 2;
export const dateLabel = (value:string) => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : 'No disponible';
const entries: [number,string,number,number,number,number,string][] = [
 [1087,'Error 502 intermitente en la API de pagos',0,0,1,1,'09T20:44'],
 [1086,'Falla la sincronización con el servicio de inventario',3,1,0,-1,'09T20:05'],
 [1085,'Pérdida de eventos en la cola de facturación',0,0,0,-1,'09T18:54'],
 [1084,'Búsqueda de clientes responde en más de 4 s',4,2,1,2,'09T18:02'],
 [1083,'Certificado TLS de staging vence en 5 días',2,1,0,3,'09T16:08'],
 [1082,'Latencia alta en el inicio de sesión con SSO',5,0,1,2,'09T15:12'],
 [1081,'El botón Exportar no responde en Safari',1,3,2,4,'08T10:15'],
 [1080,'Caída del worker de notificaciones por correo',0,0,2,1,'08T09:40'],
 [1079,'Fuga de memoria en el servicio de reportes',0,1,1,4,'08T08:20'],
 [1078,'Duplicados en el reporte de conciliación diaria',4,2,0,-1,'07T14:31'],
 [1077,'Texto cortado en el menú de navegación móvil',1,3,0,4,'07T11:02'],
 [1076,'Alertas de disco sin aviso al canal de guardia',2,2,1,3,'06T16:47'],
 [1074,'Webhooks de pagos rechazados en reintentos',3,1,0,-1,'05T12:20'],
 [1071,'Zona horaria incorrecta en exportaciones CSV',4,3,0,-1,'04T09:55'],
 [1068,'Paginación inconsistente en la API pública',0,2,0,-1,'03T17:10'],
];
const additional: [string,number,number,number][] = [
 ['Tiempos de espera en el servicio de perfiles',0,1,0],['Solicitudes duplicadas al guardar preferencias',0,1,0],['Tareas de limpieza pendientes',0,1,0],['Errores al actualizar permisos de proyecto',0,1,0],['Procesamiento lento de imágenes',0,1,0],['Demora al restaurar copias de seguridad',2,2,1],['Uso elevado de CPU en preproducción',2,2,1],['Alertas repetidas tras reiniciar el servicio',2,2,1],['Retraso en métricas del entorno de pruebas',2,2,1],['Demora en la entrega de notificaciones',3,2,1],['Conector de correo omite adjuntos',3,2,1],['Formato incorrecto en eventos de calendario',3,2,0],['El formulario pierde el foco al validar',1,3,0],['Icono de descarga desalineado',1,3,0],['Contador de avisos fuera de pantalla',1,3,0],['Sesiones antiguas visibles en el panel',5,2,0],
];
const owners = [0,0,0,0,0,1,1,1,1,2,2,2,3,3,4,4];
additional.forEach(([title,category,priority,status],i)=>entries.push([1067-i,title,category,priority,status,owners[i],'02T'+String(23-i).padStart(2,'0')+':00']));
const archive = ['Validación de acceso','Entrega de notificaciones','Actualización de inventario','Carga del panel','Exportación de registros','Procesamiento de eventos','Inicio de sesión','Sincronización de datos'];
export const seed: Incident[] = entries.map(([id,title,category,priority,status,assignee,date])=>{
 const created = '2026-11-'+date+':00';
 const resolved = id===1081 ? '2026-11-08T17:42:00' : id===1080 ? '2026-11-08T11:05:00' : undefined;
 const reporter = people[2];
 return { id:'BF-'+id,title,category:categories[category],priority:priorities[priority],status:states[status],assignee:people[assignee] ?? '',reporter,created,updated:resolved??created,resolved,
 description:id===1087 ? `**Qué pasa**

La API de pagos devuelve errores 502 de forma intermitente. El equipo está revisando las trazas del servicio.

**Resultado esperado**

Las solicitudes de pago deben completarse sin errores.` : 'El equipo registró este incidente durante el seguimiento de '+categories[category].toLowerCase()+'.',
 activity:[{text:reporter+' creó el incidente.',date:created},...(status===1?[{text:(people[assignee]??people[0])+' está trabajando en el incidente.',date:created}]:[]),...(resolved?[{text:'Se resolvió el incidente.',date:resolved}]:[])] };
});
for(let index=0;index<62;index++){
 const created=new Date(2026,9,11+Math.floor(index/3),10+index%3).toISOString();
 const resolved=new Date(Date.parse(created)+409*60000).toISOString();
 seed.push({id:'BF-'+(1040-index),title:archive[index%archive.length]+' · seguimiento '+(index+1),description:'Incidente archivado para la demostración.',category:categories[index%categories.length],priority:priorities[1+index%3],status:'Resuelto',assignee:people[index%people.length],reporter:people[2],created,updated:resolved,resolved,activity:[{text:'Se resolvió el incidente.',date:resolved}]});
}
export const trend = {labels:['27','28','29','30','31','1','2','3','4','5','6','7','8','Hoy'],created:[3,2,4,5,2,1,1,4,3,2,2,3,3,6],resolved:[2,3,3,4,3,1,0,3,4,4,3,4,3,0]};
