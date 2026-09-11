import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Power, X, Package, AlertTriangle } from 'lucide-react'
import { bobCorto } from '../../lib/formato'

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [filtro, setFiltro] = useState('todos') // todos | cuidado | bebida
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '', precio: '', categoria: 'cuidado',
    stock: '', stock_minimo: 5,
  })

  const cargar = async () => {
    const { data } = await supabase
      .from('productos').select('*').order('categoria').order('nombre')
    setProductos(data || [])
  }
  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombre: '', precio: '', categoria: 'cuidado', stock: '', stock_minimo: 5 })
    setModal(true)
  }
  const abrirEditar = (p) => {
    setEditando(p)
    setForm({
      nombre: p.nombre, precio: p.precio, categoria: p.categoria,
      stock: p.stock, stock_minimo: p.stock_minimo,
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    const payload = {
      nombre: form.nombre.trim(),
      precio: Number(form.precio),
      categoria: form.categoria,
      stock: Number(form.stock),
      stock_minimo: Number(form.stock_minimo) || 5,
    }

    if (editando) {
      const { error } = await supabase.from('productos').update(payload).eq('id', editando.id)
      if (error) return toast.error('Error: ' + error.message)
      toast.success('Producto actualizado ✓')
    } else {
      const { error } = await supabase.from('productos').insert(payload)
      if (error) return toast.error('Error: ' + error.message)
      toast.success('Producto agregado ✓')
    }
    setModal(false)
    await cargar()
  }

  const toggleActivo = async (p) => {
    const { error } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    if (error) return toast.error('Error: ' + error.message)
    toast.success(p.activo ? 'Desactivado' : 'Activado')
    await cargar()
  }

  const eliminar = async (p) => {
    const { count } = await supabase
      .from('ventas_productos').select('*', { count: 'exact', head: true })
      .eq('producto_id', p.id)
    if (count > 0) {
      if (!confirm(`${p.nombre} tiene ${count} ventas registradas. Se desactivará. ¿Continuar?`)) return
      return toggleActivo(p)
    }
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    const { error } = await supabase.from('productos').delete().eq('id', p.id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Eliminado')
    await cargar()
  }

  const filtrados = filtro === 'todos'
    ? productos
    : productos.filter(p => p.categoria === filtro)

  const catColor = {
    cuidado: 'text-info border-info/40 bg-info/5',
    bebida: 'text-dorado border-dorado/40 bg-dorado/5',
  }
  const catLabel = {
    cuidado: '🧴 Cuidado',
    bebida: '🥤 Bebida',
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-dorado font-bold flex items-center gap-2">
            <Package /> Productos
          </h1>
          <p className="text-texto-suave text-sm mt-1">
            Productos de cuidado y bebidas
          </p>
        </div>
        <button onClick={abrirNuevo}
          className="bg-dorado text-negro font-bold px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-dorado-claro transition shadow-lg shadow-dorado/20">
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { v: 'todos', l: 'Todos' },
          { v: 'cuidado', l: '🧴 Cuidado' },
          { v: 'bebida', l: '🥤 Bebidas' },
        ].map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border-2 transition ${
              filtro === f.v
                ? 'bg-dorado text-negro border-dorado'
                : 'border-dorado/20 text-texto-suave hover:border-dorado'
            }`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtrados.map(p => {
          const stockBajo = p.stock <= p.stock_minimo
          return (
            <div key={p.id}
              className={`bg-negro-suave border rounded-2xl p-4 transition ${
                p.activo ? 'border-dorado/20 hover:border-dorado/40' : 'border-gray-700 opacity-60'
              }`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-texto truncate">{p.nombre}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded border inline-block mt-1 uppercase tracking-wider font-bold ${catColor[p.categoria]}`}>
                    {catLabel[p.categoria]}
                  </span>
                </div>
                {stockBajo && p.activo && (
                  <AlertTriangle className="text-alerta shrink-0" size={18} />
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xl font-display font-bold text-dorado">{bobCorto(p.precio)}</p>
                <div className="text-right">
                  <p className={`text-lg font-bold ${stockBajo ? 'text-alerta' : 'text-exito'}`}>
                    {p.stock}
                  </p>
                  <p className="text-[10px] text-texto-muted">en stock</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dorado/10">
                <span className={`text-[11px] font-semibold ${p.activo ? 'text-exito' : 'text-error'}`}>
                  ● {p.activo ? 'Activo' : 'Inactivo'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(p)} className="p-2 text-texto-muted hover:text-dorado transition">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => toggleActivo(p)} className="p-2 text-texto-muted hover:text-alerta transition">
                    <Power size={16} />
                  </button>
                  <button onClick={() => eliminar(p)} className="p-2 text-texto-muted hover:text-error transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {filtrados.length === 0 && (
          <p className="text-texto-muted col-span-full text-center py-8">No hay productos</p>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={guardar} className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado font-bold">
                {editando ? 'Editar' : 'Nuevo'} producto
              </h2>
              <button type="button" onClick={() => setModal(false)}><X className="text-texto-muted" /></button>
            </div>

            <div className="space-y-3">
              <input required placeholder="Nombre del producto"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none" />

              <div>
                <label className="text-xs text-texto-suave font-semibold mb-1 block">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: 'cuidado', l: 'Productos De Cuidado' },
                    { v: 'bebida', l: 'Bebidas' },
                  ].map(c => (
                    <button type="button" key={c.v} onClick={() => setForm({ ...form, categoria: c.v })}
                      className={`py-3 rounded-xl border-2 font-semibold transition ${
                        form.categoria === c.v
                          ? 'bg-dorado text-negro border-dorado'
                          : 'border-dorado/20 text-texto-suave'
                      }`}>
                      {c.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-texto-suave font-semibold mb-1 block">Precio (BOB)</label>
                  <input required type="number" step="0.01" inputMode="decimal" placeholder="0"
                    value={form.precio}
                    onChange={e => setForm({ ...form, precio: e.target.value })}
                    className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-texto-suave font-semibold mb-1 block">Stock actual</label>
                  <input required type="number" inputMode="numeric" placeholder="0"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-texto-suave font-semibold mb-1 block">
                  Alerta stock bajo (mínimo)
                </label>
                <input type="number" inputMode="numeric" placeholder="5"
                  value={form.stock_minimo}
                  onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
                  className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none" />
                <p className="text-[11px] text-texto-muted mt-1">
                  Te avisará cuando el stock llegue a este número o menos
                </p>
              </div>
            </div>

            <button className="w-full mt-5 bg-dorado text-negro font-bold py-3 rounded-xl hover:bg-dorado-claro transition">
              {editando ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}