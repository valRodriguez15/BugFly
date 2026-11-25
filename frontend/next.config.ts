import type { NextConfig } from 'next';

// El proxy es una configuración del frontend: FastAPI no se modifica.
// Usa el puerto 8000 local si no se define BUGFLY_API_URL.
const backend=(process.env.BUGFLY_API_URL||'http://127.0.0.1:8000').replace(/\/+$/,'');
const nextConfig:NextConfig={
 async rewrites(){
  return [{source:'/api/bugfly/:path*',destination:backend+'/:path*'}];
 },
};
export default nextConfig;
