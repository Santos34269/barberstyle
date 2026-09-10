import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RegistrarCorte from './pages/RegistrarCorte'
import Historial from './pages/Historial'
import Reportes from './pages/Reportes'
import Ayudantes from './pages/admin/Ayudantes'
import Servicios from './pages/admin/Servicios'
import Configuracion from './pages/admin/Configuracion'
import Usuarios from './pages/admin/Usuarios'

const toastOpts = { style: { background: '#1A1A1A', color: '#fff', border: '1px solid #D4AF37' } }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="h-screen flex items-center justify-center text-dorado bg-negro">Cargando...</div>
  if (!session) return <><Toaster position="top-right" toastOptions={toastOpts} /><Login /></>

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={toastOpts} />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registrar" element={<RegistrarCorte />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/admin/ayudantes" element={<Ayudantes />} />
          <Route path="/admin/servicios" element={<Servicios />} />
          <Route path="/admin/config" element={<Configuracion />} />
          <Route path="/admin/usuarios" element={<Usuarios />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}