import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata = { title: 'BugFly · Gestión de incidentes', description: 'Panel de incidentes del Equipo Plataforma' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="es" className={GeistSans.variable + ' ' + GeistMono.variable}><body>{children}</body></html>;
}
