import Detail from './detail';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{creado?:string}>}){
 const [{id},{creado}]=await Promise.all([params,searchParams]);
 return <Detail key={id} id={id} created={creado==='1'}/>;
}
