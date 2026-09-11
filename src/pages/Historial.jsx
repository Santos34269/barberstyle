import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Eye, Search, X, Scissors, User, Filter } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { bob, bobCorto } from '../lib/formato'
import { fechaBolivia, timestampBolivia } from '../lib/fecha'

export default function Historial() {
  const [cortes, setCortes] = useState([])
  const [ayudantes, setAyudantes] = useState([])
  const [filtro, setFiltro] = useState('')
  const [ayudanteFiltro, setAyudanteFiltro] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const cargarAyudantes = async () => {
    const { data } = await supabase.from('ayudantes').select('id, nombre').order('nombre')
    setAyudantes(data || [])
  }

  const cargar = async () => {
    setCargando(true)

    let query = supabase
      .from('cortes')
      .select(`
        id, fecha, total, metodo_pago, monto_efectivo, monto_qr, cliente, notas, created_at,
        ayudante_id,
        ayudante:ayudantes(id, nombre),
        perfil:perfiles(usuario, nombre_completo),
        detalle:corte_detalle(nombre_servicio, precio)
      `)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    // Si hay filtro por ayudante, traer TODO su historial (sin límite)
    // Si no, traer últimos 200
    if (ayudanteFiltro !== 'todos') {
      query = query.eq('ayudante_id', ayudanteFiltro)
    } else {
      query = query.limit(200)
    }

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data, error } = await query
    if (error) {
      toast.error('Error al cargar historial')
      setCargando(false)
      return
    }

    setCortes(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarAyudantes()
  }, [])

  useEffect(() => {
    cargar()
  }, [ayudanteFiltro, desde, hasta])

  const eliminar = async () => {
    if (!eliminando) return
    await supabase.from('corte_detalle').delete().eq('corte_id', eliminando.id)
    const { error } = await supabase.from('cortes').delete().eq('id', eliminando.id)
    setEliminando(null)
    if (error) return toast.error('Error al eliminar')
    toast.success('Corte eliminado')
    await cargar()
  }

  const limpiarFiltros = () => {
    setFiltro('')
    setAyudanteFiltro('todos')
    setDesde('')
    setHasta('')
  }

  const filtrados = cortes.filter(c => {
    if (!filtro.trim()) return true
    const t = filtro.toLowerCase()
    return (
      c.ayudante?.nombre?.toLowerCase().includes(t) ||
      c.cliente?.toLowerCase().includes(t) ||
      c.fecha?.includes(t) ||
      c.detalle?.some(d => d.nombre_servicio.toLowerCase().includes(t))
    )
  })

  const totalFiltrado = filtrados.reduce((s, c) => s + Number(c.total), 0)

  const colorPago = {
    efectivo: 'text-exito border-exito/40 bg-exito/5',
    qr: 'text-info border-info/40 bg-info/5',
    mixto: 'text-dorado border-dorado/40 bg-dorado/5',
  }

  const hayFiltrosActivos = ayudanteFiltro !== 'todos' || desde || hasta

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold">Historial</h1>
          <p className="text-texto-suave text-sm mt-1">
            {ayudanteFiltro !== 'todos'
              ? `Historial completo del barbero (${filtrados.length} cortes)`
              : `Últimos 200 cortes registrados`}
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-muted" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-negro-suave border border-dorado/20 focus:border-dorado rounded-xl pl-10 pr-3 py-2.5 outline-none transition" />
          </div>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`px-4 py-2.5 rounded-xl font-semibold border-2 transition flex items-center gap-2 ${
              mostrarFiltros || hayFiltrosActivos
                ? 'bg-dorado text-negro border-dorado'
                : 'border-dorado/20 text-dorado hover:border-dorado'
            }`}>
            <Filter size={16} /> Filtros
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {mostrarFiltros && (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4 mb-5">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-texto-suave font-semibold block mb-1">Barbero</label>
              <select value={ayudanteFiltro}
                onChange={e => setAyudanteFiltro(e.target.value)}
                className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none">
                <option value="todos">Todos los barberos</option>
                {ayudantes.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-texto-suave font-semibold block mb-1">Desde</label>
              <input type="date" value={desde}
                onChange={e => setDesde(e.target.value)}
                className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none" />
            </div>
            <div>
              <label className="text-xs text-texto-suave font-semibold block mb-1">Hasta</label>
              <input type="date" value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none" />
            </div>
          </div>
          {hayFiltrosActivos && (
            <button onClick={limpiarFiltros}
              className="mt-3 text-sm text-dorado hover:text-dorado-claro font-semibold flex items-center gap-1">
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Total filtrado */}
      {filtrados.length > 0 && (
        <div className="bg-dorado/5 border border-dorado/30 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-texto-suave text-sm font-semibold">Total en el filtro actual</p>
            <p className="text-texto-muted text-xs">{filtrados.length} cortes</p>
          </div>
          <p className="text-3xl font-display text-dorado font-bold">{bob(totalFiltrado)}</p>
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <p className="text-texto-muted text-center py-8">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
          <Scissors className="text-dorado/40 mx-auto mb-3" size={40} />
          <p className="text-texto-muted">No hay cortes registrados</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-negro-suave border border-dorado/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-negro border-b border-dorado/20">
                  <tr className="text-left text-texto-suave">
                    <th className="p-4 font-semibold">Fecha</th>
                    <th className="p-4 font-semibold">Barbero</th>
                    <th className="p-4 font-semibold">Cliente</th>
                    <th className="p-4 font-semibold">Servicios</th>
                    <th className="p-4 font-semibold">Pago</th>
                    <th className="p-4 font-semibold text-right">Total</th>
                    <th className="p-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(c => (
                    <tr key={c.id} className="border-b border-dorado/5 hover:bg-white/[0.02] transition">
                      <td className="p-4 text-texto-suave whitespace-nowrap">{fechaBolivia(c.fecha)}</td>
                      <td className="p-4 font-semibold text-dorado whitespace-nowrap">
                        {c.ayudante?.nombre || '—'}
                      </td>
                      <td className="p-4 text-texto-suave">
                        {c.cliente || <span className="text-texto-muted italic">Sin nombre</span>}
                      </td>
                      <td className="p-4 text-texto-suave max-w-xs">
                        {c.detalle?.map(d => d.nombre_servicio).join(', ') || '—'}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded border uppercase font-bold ${colorPago[c.metodo_pago]}`}>
                          {c.metodo_pago}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-dorado whitespace-nowrap">
                        {bobCorto(c.total)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setDetalle(c)}
                            className="p-2 text-texto-muted hover:text-dorado transition"
                            title="Ver detalle">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => setEliminando(c)}
                            className="p-2 text-texto-muted hover:text-error transition"
                            title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map(c => (
              <div key={c.id} className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-dorado font-semibold truncate">{c.ayudante?.nombre}</p>
                    <p className="text-xs text-texto-muted">{fechaBolivia(c.fecha)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border uppercase font-bold shrink-0 ${colorPago[c.metodo_pago]}`}>
                    {c.metodo_pago}
                  </span>
                </div>

                {c.cliente && (
                  <p className="text-xs text-texto-suave mb-1 flex items-center gap-1">
                    <User size={12} /> {c.cliente}
                  </p>
                )}

                <p className="text-sm text-texto-suave mb-3 line-clamp-2">
                  {c.detalle?.map(d => d.nombre_servicio).join(', ')}
                </p>

                <div className="flex justify-between items-center pt-2 border-t border-dorado/10">
                  <span className="text-xl font-display text-dorado font-bold">{bobCorto(c.total)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setDetalle(c)} className="p-2 text-texto-muted hover:text-dorado">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => setEliminando(c)} className="p-2 text-texto-muted hover:text-error">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal eliminar */}
      <ConfirmDialog
        open={!!eliminando}
        titulo="Eliminar corte"
        mensaje="Esta acción no se puede deshacer."
        detalle={eliminando && (
          <>
            <p><span className="text-texto-suave">Barbero:</span> {eliminando.ayudante?.nombre}</p>
            <p><span className="text-texto-suave">Fecha:</span> {fechaBolivia(eliminando.fecha)}</p>
            <p><span className="text-texto-suave">Total:</span> <span className="text-dorado font-bold">{bob(eliminando.total)}</span></p>
          </>
        )}
        confirmText="Sí, eliminar"
        onConfirm={eliminar}
        onCancel={() => setEliminando(null)}
      />

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado font-bold">Detalle del corte</h2>
              <button onClick={() => setDetalle(null)} className="text-texto-muted hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-texto-suave">Fecha:</span> {fechaBolivia(detalle.fecha)}</p>
              <p><span className="text-texto-suave">Hora:</span> {timestampBolivia(detalle.created_at)}</p>
              <p><span className="text-texto-suave">Barbero:</span> <span className="text-dorado font-semibold">{detalle.ayudante?.nombre}</span></p>
              {detalle.cliente && (
                <p><span className="text-texto-suave">Cliente:</span> {detalle.cliente}</p>
              )}
              <p><span className="text-texto-suave">Registrado por:</span> {detalle.perfil?.nombre_completo || detalle.perfil?.usuario}</p>

              <div className="pt-3 border-t border-dorado/20">
                <p className="text-texto-suave mb-1">Servicios:</p>
                {detalle.detalle?.map((d, i) => (
                  <div key={i} className="flex justify-between text-texto-suave py-0.5">
                    <span>• {d.nombre_servicio}</span>
                    <span>{bobCorto(d.precio)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-dorado/20">
                <div className="flex justify-between">
                  <span className="text-texto-suave">Método:</span>
                  <span className="capitalize font-semibold">{detalle.metodo_pago}</span>
                </div>
                {detalle.metodo_pago === 'mixto' && (
                  <>
                    <div className="flex justify-between text-texto-suave text-sm mt-1">
                      <span>Efectivo:</span>
                      <span>{bobCorto(detalle.monto_efectivo)}</span>
                    </div>
                    <div className="flex justify-between text-texto-suave text-sm">
                      <span>QR:</span>
                      <span>{bobCorto(detalle.monto_qr)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-dorado/20 flex justify-between items-center">
                <span className="text-texto-suave font-semibold">TOTAL:</span>
                <span className="text-2xl font-display text-dorado font-bold">{bob(detalle.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}