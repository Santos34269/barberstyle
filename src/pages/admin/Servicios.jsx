import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Power, X } from 'lucide-react'

export default function Servicios() {
  const [servicios, setServicios] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', precio: '', categoria: 'general' })

  const cargar = async () => {
    const { data } = await supabase.from('servicios').select('*').order('nombre')
    setServicios(data || [])
  }
  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditando(null); setForm({ nombre: '', precio: '', categoria: 'general' }); setModal(true) }
  const abrirEditar = (s) => { setEditando(s); setForm({ nombre: s.nombre, precio: s.precio, categoria: s.categoria || 'general' }); setModal(true) }

  const guardar = async (e) => {
    e.preventDefault()
    const payload = { ...form, precio: Number(form.precio) }
    if (editando) {
      const { error } = await supabase.from('servicios').update(payload).eq('id', editando.id)
      if (error) return toast.error('Error al editar')
      toast.success('Servicio actualizado ✓')
    } else {
      const { error } = await supabase.from('servicios').insert(payload)
      if (error) return toast.error('Error al crear')
      toast.success('Servicio agregado ✓')
    }
    setModal(false); cargar()
  }

  const toggleActivo = async (s) => {
    await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id)
    toast.success(s.activo ? 'Desactivado' : 'Activado')
    cargar()
  }

  const eliminar = async (s) => {
    const { count } = await supabase.from('corte_detalle').select('*', { count: 'exact', head: true }).eq('servicio_id', s.id)
    if (count > 0) {
      if (!confirm(`${s.nombre} fue usado ${count} veces. No se puede eliminar, se desactivará. ¿Continuar?`)) return
      return toggleActivo(s)
    }
    if (!confirm(`¿Eliminar "${s.nombre}"?`)) return
    await supabase.from('servicios').delete().eq('id', s.id)
    toast.success('Eliminado')
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-dorado">Servicios</h1>
          <p className="text-gray-400 text-sm">Catálogo de cortes y precios</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-dorado text-negro font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-dorado-claro transition">
          <Plus size={18} /> Agregar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {servicios.map(s => (
          <div key={s.id}
            className={`bg-negro-suave border rounded-xl p-4 ${
              s.activo ? 'border-dorado/30' : 'border-gray-700 opacity-60'
            }`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">{s.nombre}</p>
                <p className="text-xs text-gray-500 capitalize">{s.categoria}</p>
              </div>
              <span className={`text-xs ${s.activo ? 'text-green-400' : 'text-red-400'}`}>
                ● {s.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-2xl font-display text-dorado mb-3">Bs {s.precio}</p>
            <div className="flex justify-end gap-1">
              <button onClick={() => abrirEditar(s)} className="p-2 text-gray-400 hover:text-dorado"><Pencil size={16} /></button>
              <button onClick={() => toggleActivo(s)} className="p-2 text-gray-400 hover:text-yellow-400"><Power size={16} /></button>
              <button onClick={() => eliminar(s)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {servicios.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-8">No hay servicios registrados</p>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={guardar} className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado">{editando ? 'Editar' : 'Nuevo'} servicio</h2>
              <button type="button" onClick={() => setModal(false)}><X className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input required placeholder="Nombre del servicio" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
              <input required type="number" placeholder="Precio (Bs)" value={form.precio}
                onChange={e => setForm({ ...form, precio: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
              <input placeholder="Categoría (ej: corte, tinte, cejas)" value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
            </div>
            <button className="w-full mt-5 bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition">
              {editando ? 'Guardar cambios' : 'Agregar servicio'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}