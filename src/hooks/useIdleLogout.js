import { useEffect } from 'react'
import { useIdleTimer } from 'react-idle-timer'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const TIEMPO_INACTIVIDAD = 5 * 60 * 1000 // 5 min

export function useIdleLogout() {
  const handleOnIdle = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.auth.signOut()
      toast.error('Sesión cerrada por inactividad')
    }
  }

  useIdleTimer({
    timeout: TIEMPO_INACTIVIDAD,
    onIdle: handleOnIdle,
    debounce: 500,
  })
}