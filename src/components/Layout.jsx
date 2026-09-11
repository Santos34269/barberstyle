import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Scissors, ShoppingBag, History, BarChart3,
  Users, Tags, Package, Settings, UserCog, Menu, X, LogOut,
  TrendingUp, Star
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Layout({ children }) {
  const { perfil, isSuperadmin, isCajero } = useAuth()
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin', 'admin', 'cajero'] },
    { to: '/registrar', icon: Scissors, label: 'Registrar corte', roles: ['superadmin', 'admin', 'cajero'] },
    { to: '/vender', icon: ShoppingBag, label: 'Vender producto', roles: ['superadmin', 'admin', 'cajero'] },
    { to: '/historial', icon: History, label: 'Historial', roles: ['superadmin', 'admin'] },
    { to: '/reportes', icon: BarChart3, label: 'Reportes cortes', roles: ['superadmin', 'admin'] },
    { to: '/reportes-productos', icon: TrendingUp, label: 'Reportes productos', roles: ['superadmin', 'admin'] },
    { to: '/reportes-clientes', icon: Star, label: 'Clientes fieles', roles: ['superadmin', 'admin'] },
    { to: '/admin/ayudantes', icon: Users, label: 'Ayudantes', roles: ['superadmin', 'admin'] },
    { to: '/admin/servicios', icon: Tags, label: 'Servicios', roles: ['superadmin', 'admin'] },
    { to: '/admin/productos', icon: Package, label: 'Productos', roles: ['superadmin', 'admin'] },
    { to: '/admin/config', icon: Settings, label: 'Configuración', roles: ['superadmin', 'admin'] },
    { to: '/admin/usuarios', icon: UserCog,
      label: isSuperadmin ? 'Usuarios' : 'Cajeros',
      roles: ['superadmin', 'admin'] },
  ].filter(l => l.roles.includes(perfil?.rol))

  const inicial = (perfil?.nombre_completo || perfil?.usuario || '?').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-negro flex">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-negro-suave border-r border-dorado/15 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-dorado/15">
          <img src="/logo.png" alt="New Style"
            className="w-12 h-12 rounded-full object-cover border-2 border-dorado shadow-lg shadow-dorado/20" />
          <div>
            <h1 className="font-display text-dorado text-lg leading-tight font-bold">New Style</h1>
            <p className="text-[10px] text-texto-muted tracking-widest uppercase">Barber Shop</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-dorado text-negro shadow-lg shadow-dorado/20'
                    : 'text-texto-suave hover:bg-negro-hover hover:text-dorado'
                }`}>
              <l.icon size={18} strokeWidth={2.3} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-dorado/15 p-3">
          <div className="flex items-center gap-3 px-2 py-2.5 mb-1 rounded-xl bg-negro-card">
            <div className="w-10 h-10 rounded-full bg-dorado text-negro flex items-center justify-center font-bold text-lg">
              {inicial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-texto truncate">
                {perfil?.nombre_completo || perfil?.usuario}
              </p>
              <p className="text-[10px] text-dorado uppercase tracking-wider font-bold">
                {perfil?.rol}
              </p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-texto-muted hover:text-error hover:bg-error/10 rounded-lg transition">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-negro-suave/95 backdrop-blur border-b border-dorado/15 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-9 h-9 rounded-full border border-dorado" />
          <span className="font-display text-dorado font-bold">New Style</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-dorado p-2">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-negro/98 backdrop-blur pt-20 px-4 overflow-auto">
          <nav className="space-y-2 pb-8">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-semibold ${
                    isActive ? 'bg-dorado text-negro' : 'text-texto-suave bg-negro-card'
                  }`}>
                <l.icon size={20} /> {l.label}
              </NavLink>
            ))}
            <button onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-error bg-error/10 rounded-xl mt-4">
              <LogOut size={20} /> Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* CONTENIDO */}
      <main className="flex-1 pt-16 md:pt-0 min-w-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  )
}