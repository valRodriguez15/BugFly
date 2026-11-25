import Listing from './listing';
export default async function Page({searchParams}:{searchParams:Promise<{vista?:string;buscar?:string}>}){
 const params=await searchParams;
 return <Listing key={params.vista??'activos'} viewId={params.vista??'activos'} searchInitially={params.buscar==='1'}/>;
}
