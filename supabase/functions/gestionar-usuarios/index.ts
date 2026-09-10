import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')!
    
    // URL (siempre disponible)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    
    // Puede venir como PUBLISHABLE_KEY (nuevo) o ANON_KEY (viejo)
    const SUPABASE_PUBLISHABLE_KEY = 
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? 
      Deno.env.get('SUPABASE_ANON_KEY')!
    
    const SUPABASE_SECRET_KEY = 
      Deno.env.get('SUPABASE_SECRET_KEY') ?? 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return json({ error: 'No autorizado' }, 401)

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

    const { data: perfil } = await supabaseAdmin
      .from('perfiles').select('*').eq('id', user.id).single()
    if (!perfil) return json({ error: 'Perfil no encontrado' }, 403)

    const body = await req.json()
    const { accion, usuario, password, nombre_completo, rol, sucursal, id } = body

    const puedeGestionar = (rolObjetivo: string) => {
      if (perfil.rol === 'superadmin') return ['admin', 'cajero'].includes(rolObjetivo)
      if (perfil.rol === 'admin') return rolObjetivo === 'cajero'
      return false
    }

    // ============ CREAR ============
    if (accion === 'crear') {
      if (!puedeGestionar(rol)) return json({ error: 'Sin permiso' }, 403)
      const email = `${usuario.toLowerCase()}@newstyle.local`
      const { data: nuevo, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (error) return json({ error: error.message }, 400)

      await supabaseAdmin.from('perfiles').insert({
        id: nuevo.user.id, usuario, nombre_completo, rol, sucursal,
        created_by: perfil.id,
      })
      return json({ ok: true })
    }

    // ============ EDITAR ============
    if (accion === 'editar') {
      const { data: objetivo } = await supabaseAdmin
        .from('perfiles').select('*').eq('id', id).single()
      if (!objetivo) return json({ error: 'Usuario no existe' }, 404)
      if (!puedeGestionar(objetivo.rol)) return json({ error: 'Sin permiso' }, 403)

      await supabaseAdmin.from('perfiles')
        .update({ nombre_completo, sucursal }).eq('id', id)
      if (password) await supabaseAdmin.auth.admin.updateUserById(id, { password })
      return json({ ok: true })
    }

    // ============ TOGGLE ACTIVO ============
    if (accion === 'toggle') {
      const { data: objetivo } = await supabaseAdmin
        .from('perfiles').select('*').eq('id', id).single()
      if (!objetivo) return json({ error: 'Usuario no existe' }, 404)
      if (!puedeGestionar(objetivo.rol)) return json({ error: 'Sin permiso' }, 403)

      await supabaseAdmin.from('perfiles')
        .update({ activo: !objetivo.activo }).eq('id', id)
      await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: objetivo.activo ? '876000h' : 'none',
      })
      return json({ ok: true })
    }

    // ============ ELIMINAR (solo superadmin) ============
    if (accion === 'eliminar') {
      if (perfil.rol !== 'superadmin') return json({ error: 'Sin permiso' }, 403)
      const { data: objetivo } = await supabaseAdmin
        .from('perfiles').select('*').eq('id', id).single()
      if (!objetivo) return json({ error: 'Usuario no existe' }, 404)
      if (objetivo.id === perfil.id) return json({ error: 'No puedes eliminarte a ti mismo' }, 400)

      await supabaseAdmin.from('perfiles').delete().eq('id', id)
      await supabaseAdmin.auth.admin.deleteUser(id)
      return json({ ok: true })
    }

    return json({ error: 'Acción inválida' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}