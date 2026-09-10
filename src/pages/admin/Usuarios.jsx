import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { Plus, Pencil, Power, Trash2, X, UserCog, Store } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function Usuarios() {
  const { perfil, isSuperadmin, isAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [form, setForm] = useState({
    usuario: '', password: '', nombre_completo: '', rol: 'cajero', sucursal: 'Principal'
  })

  const cargar = async () => {
    let query = supabase.from('perfiles').select('*').order('rol').order('usuario')

    if (isSuperadmin) {
      // Superadmin ve todos EXCEPTO a sí mismo
      query = query.neq('id', perfil.id)
    } else if (isAdmin) {
      // Admin solo ve cajeros
      query = query.eq('rol', 'cajero')
    }

    const { data } = await query
    setUsuarios(data || [])
  }

  useEffect(() => { if (perfil) cargar() }, [perfil])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({
      usuario: '', password: '', nombre_completo: '',
      rol: 'cajero',
      sucursal: 'Principal'
    })
    setModal(true)
  }

  const abrirEditar = (u) => {
    setEditando(u)
    setForm({
      usuario: u.usuario,
      password: '',
      nombre_completo: u.nombre_completo || '',
      rol: u.rol,
      sucursal: u.sucursal || 'Principal'
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const accion = editando ? 'editar' : 'crear'
    const payload = editando
      ? { accion, id: editando.id, nombre_completo: form.nombre_completo, sucursal: form.sucursal, password: form.password || null }
      : { accion, usuario: form.usuario, password: form.password, nombre_completo: form.nombre_completo, rol: form.rol, sucursal: form.sucursal }

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestionar-usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) return toast.error(json.error || 'Error')

    toast.success(editando ? 'Usuario actualizado ✓' : 'Usuario creado ✓')
    setModal(false)
    cargar()
  }

  const toggleActivo = async (u) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestionar-usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ accion: 'toggle', id: u.id }),
    })
    if (!res.ok) return toast.error('Error')
    toast.success(u.activo ? 'Desactivado' : 'Activado')
    cargar()
  }

  const eliminar = async () => {
    if (!eliminando) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gestionar-usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ accion: 'eliminar', id: eliminando.id }),
    })
    const json = await res.json()
    setEliminando(null)
    if (!res.ok) return toast.error(json.error || 'Error')
    toast.success('Usuario eliminado')
    cargar()
  }

  const colorRol = {
    superadmin: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5',
    admin: 'text-dorado border-dorado/40 bg-dorado/5',
    cajero: 'text-blue-400 border-blue-400/40 bg-blue-400/5',
  }

  const titulo = isSuperadmin ? 'Usuarios del sistema' : 'Cajeros'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-dorado flex items-center gap-2">
            <UserCog /> {titulo}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSuperadmin ? 'Gestiona admins y cajeros' : 'Gestiona tus cajeros por sucursal'}
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-dorado text-negro font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-dorado-claro transition">
          <Plus size={18} /> {isSuperadmin ? 'Nuevo usuario' : 'Nuevo cajero'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {usuarios.map(u => (
          <div key={u.id}
            className={`bg-negro-suave border rounded-xl p-4 ${
              u.activo ? 'border-dorado/30' : 'border-gray-700 opacity-60'
            }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{u.nombre_completo || u.usuario}</p>
                <p className="text-xs text-gray-500 truncate">@{u.usuario}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded border shrink-0 ${colorRol[u.rol]}`}>
                {u.rol}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
              <Store size={12} /> {u.sucursal || 'Principal'}
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${u.activo ? 'text-green-400' : 'text-red-400'}`}>
                ● {u.activo ? 'Activo' : 'Inactivo'}
              </span>
              <div className="flex gap-1">
                <button onClick={() => abrirEditar(u)} className="p-2 text-gray-400 hover:text-dorado">
                  <Pencil size={16} />
                </button>
                <button onClick={() => toggleActivo(u)} className="p-2 text-gray-400 hover:text-yellow-400">
                  <Power size={16} />
                </button>
                {isSuperadmin && (
                  <button onClick={() => setEliminando(u)} className="p-2 text-gray-400 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {usuarios.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-8">No hay usuarios registrados</p>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={guardar} className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado">
                {editando ? 'Editar' : 'Nuevo'} {form.rol}
              </h2>
              <button type="button" onClick={() => setModal(false)}><X className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              {!editando && (
                <input required placeholder="Usuario (ej: cajero2)"
                  value={form.usuario}
                  onChange={e => setForm({ ...form, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
              )}

              <input placeholder="Nombre completo"
                value={form.nombre_completo}
                onChange={e => setForm({ ...form, nombre_completo: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />

              <input type="text" placeholder={editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required={!editando}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />

              <input placeholder="Sucursal (ej: Centro, Norte)"
                value={form.sucursal}
                onChange={e => setForm({ ...form, sucursal: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />

              {/* Solo superadmin elige rol al crear */}
              {isSuperadmin && !editando && (
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                  className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none">
                  <option value="cajero">💰 Cajero</option>
                  <option value="admin">🛡️ Admin</option>
                </select>
              )}
            </div>

            <button className="w-full mt-5 bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition">
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        </div>
      )}

      {/* Confirmación eliminar */}
      <ConfirmDialog
        open={!!eliminando}
        titulo="Eliminar usuario"
        mensaje="Esta acción es permanente. Se recomienda desactivar en lugar de eliminar."
        detalle={eliminando && (
          <>
            <p><span className="text-gray-400">Usuario:</span> @{eliminando.usuario}</p>
            <p><span className="text-gray-400">Rol:</span> {eliminando.rol}</p>
            <p><span className="text-gray-400">Sucursal:</span> {eliminando.sucursal}</p>
          </>
        )}
        confirmText="Sí, eliminar"
        onConfirm={eliminar}
        onCancel={() => setEliminando(null)}
      />
    </div>
  )
}