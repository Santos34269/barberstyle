import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Power, X } from 'lucide-react'

export default function Ayudantes() {
  const [ayudantes, setAyudantes] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', telefono: '', color: '#D4AF37' })

  const cargar = async () => {
    const { data } = await supabase.from('ayudantes').select('*').order('nombre')
    setAyudantes(data || [])
  }
  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => { setEditando(null); setForm({ nombre: '', telefono: '', color: '#D4AF37' }); setModal(true) }
  const abrirEditar = (a) => { setEditando(a); setForm({ nombre: a.nombre, telefono: a.telefono || '', color: a.color }); setModal(true) }

  const guardar = async (e) => {
    e.preventDefault()
    if (editando) {
      const { error } = await supabase.from('ayudantes').update(form).eq('id', editando.id)
      if (error) return toast.error('Error al editar')
      toast.success('Ayudante actualizado ✓')
    } else {
      const { error } = await supabase.from('ayudantes').insert(form)
      if (error) return toast.error('Error al crear')
      toast.success('Ayudante agregado ✓')
    }
    setModal(false); cargar()
  }

  const toggleActivo = async (a) => {
    await supabase.from('ayudantes').update({ activo: !a.activo }).eq('id', a.id)
    toast.success(a.activo ? 'Desactivado' : 'Activado')
    cargar()
  }

  const eliminar = async (a) => {
    const { count } = await supabase.from('cortes').select('*', { count: 'exact', head: true }).eq('ayudante_id', a.id)
    if (count > 0) {
      if (!confirm(`${a.nombre} tiene ${count} cortes registrados. No se puede eliminar, se desactivará. ¿Continuar?`)) return
      return toggleActivo(a)
    }
    if (!confirm(`¿Eliminar a ${a.nombre}?`)) return
    await supabase.from('ayudantes').delete().eq('id', a.id)
    toast.success('Eliminado')
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-dorado">Ayudantes</h1>
          <p className="text-gray-400 text-sm">Gestiona tu equipo de barberos</p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-dorado text-negro font-semibold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-dorado-claro transition">
          <Plus size={18} /> Agregar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {ayudantes.map(a => (
          <div key={a.id}
            className={`bg-negro-suave border rounded-xl p-4 flex items-center gap-3 transition ${
              a.activo ? 'border-dorado/30' : 'border-gray-700 opacity-60'
            }`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-negro shrink-0"
              style={{ background: a.color }}>
              {a.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{a.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{a.telefono || 'Sin teléfono'}</p>
              <span className={`text-xs ${a.activo ? 'text-green-400' : 'text-red-400'}`}>
                ● {a.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => abrirEditar(a)} className="p-2 text-gray-400 hover:text-dorado"><Pencil size={16} /></button>
              <button onClick={() => toggleActivo(a)} className="p-2 text-gray-400 hover:text-yellow-400"><Power size={16} /></button>
              <button onClick={() => eliminar(a)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {ayudantes.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-8">No hay ayudantes registrados</p>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={guardar} className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado">{editando ? 'Editar' : 'Nuevo'} ayudante</h2>
              <button type="button" onClick={() => setModal(false)}><X className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input required placeholder="Nombre" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
              <input placeholder="Teléfono (opcional)" value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Color identificador</label>
                <input type="color" value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer bg-transparent" />
              </div>
            </div>
            <button className="w-full mt-5 bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition">
              {editando ? 'Guardar cambios' : 'Agregar ayudante'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}