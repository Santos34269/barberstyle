import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)
      const { data } = await supabase
        .from('perfiles').select('*').eq('id', session.user.id).single()
      setPerfil(data)
      setLoading(false)
    }
    cargar()
    const { data: sub } = supabase.auth.onAuthStateChange(() => cargar())
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    user, perfil, loading,
    rol: perfil?.rol,
    isSuperadmin: perfil?.rol === 'superadmin',
    isAdmin: perfil?.rol === 'admin',
    isCajero: perfil?.rol === 'cajero',
  }
}