import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Pencil, Search, X, Scissors } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Historial() {
  const [cortes, setCortes] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [eliminando, setEliminando] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('cortes')
      .select(`
        id, fecha, total, metodo_pago, monto_efectivo, monto_qr, notas, created_at,
        ayudante:ayudantes(nombre),
        perfil:perfiles(usuario, nombre_completo),
        detalle:corte_detalle(nombre_servicio, precio)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
    setCortes(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const eliminar = async () => {
    if (!eliminando) return
    await supabase.from('corte_detalle').delete().eq('corte_id', eliminando.id)
    const { error } = await supabase.from('cortes').delete().eq('id', eliminando.id)
    setEliminando(null)
    if (error) return toast.error('Error al eliminar')
    toast.success('Corte eliminado')
    cargar()
  }

  const filtrados = cortes.filter(c => {
    const t = filtro.toLowerCase()
    return (
      c.ayudante?.nombre?.toLowerCase().includes(t) ||
      c.fecha?.includes(t) ||
      c.detalle?.some(d => d.nombre_servicio.toLowerCase().includes(t))
    )
  })

  const colorPago = {
    efectivo: 'text-green-400 border-green-400/30 bg-green-400/5',
    qr: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    mixto: 'text-dorado border-dorado/30 bg-dorado/5',
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-dorado">Historial</h1>
          <p className="text-gray-400 text-sm">Últimos 200 cortes registrados</p>
        </div>
        <div className="relative md:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar barbero, fecha, servicio..."
            className="w-full bg-negro-suave border border-gray-700 focus:border-dorado rounded-lg pl-10 pr-3 py-2.5 outline-none" />
        </div>
      </div>

      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
          <Scissors className="text-dorado/40 mx-auto mb-3" size={40} />
          <p className="text-gray-400">No hay cortes registrados</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden md:block bg-negro-suave border border-dorado/20 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-negro border-b border-dorado/20">
                <tr className="text-left text-gray-400">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Barbero</th>
                  <th className="p-4">Servicios</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => (
                  <tr key={c.id} className="border-b border-gray-800 hover:bg-white/5 transition">
                    <td className="p-4 text-gray-300">{c.fecha}</td>
                    <td className="p-4 font-semibold text-dorado">{c.ayudante?.nombre || '—'}</td>
                    <td className="p-4 text-gray-300">
                      {c.detalle?.map(d => d.nombre_servicio).join(', ') || '—'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded border ${colorPago[c.metodo_pago]}`}>
                        {c.metodo_pago}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-dorado">Bs {c.total}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setDetalle(c)}
                          className="p-2 text-gray-400 hover:text-dorado" title="Ver detalle">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setEliminando(c)}
                          className="p-2 text-gray-400 hover:text-red-400" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtrados.map(c => (
              <div key={c.id} className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-dorado font-semibold">{c.ayudante?.nombre}</p>
                    <p className="text-xs text-gray-500">{c.fecha}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${colorPago[c.metodo_pago]}`}>
                    {c.metodo_pago}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  {c.detalle?.map(d => d.nombre_servicio).join(', ')}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-display text-dorado">Bs {c.total}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setDetalle(c)} className="p-2 text-gray-400 hover:text-dorado">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setEliminando(c)} className="p-2 text-gray-400 hover:text-red-400">
                      <Trash2 size={16} />
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
            <p><span className="text-gray-400">Barbero:</span> {eliminando.ayudante?.nombre}</p>
            <p><span className="text-gray-400">Fecha:</span> {eliminando.fecha}</p>
            <p><span className="text-gray-400">Total:</span> <span className="text-dorado font-bold">Bs {eliminando.total}</span></p>
          </>
        )}
        confirmText="Sí, eliminar"
        onConfirm={eliminar}
        onCancel={() => setEliminando(null)}
      />

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl text-dorado">Detalle del corte</h2>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-gray-400">Fecha:</span> {detalle.fecha}</p>
              <p><span className="text-gray-400">Barbero:</span> <span className="text-dorado">{detalle.ayudante?.nombre}</span></p>
              <p><span className="text-gray-400">Registrado por:</span> {detalle.perfil?.nombre_completo || detalle.perfil?.usuario}</p>

              <div className="pt-2 border-t border-dorado/20">
                <p className="text-gray-400 mb-1">Servicios:</p>
                {detalle.detalle?.map((d, i) => (
                  <div key={i} className="flex justify-between text-gray-300">
                    <span>• {d.nombre_servicio}</span>
                    <span>Bs {d.precio}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dorado/20">
                <div className="flex justify-between">
                  <span className="text-gray-400">Método:</span>
                  <span className="capitalize">{detalle.metodo_pago}</span>
                </div>
                {detalle.metodo_pago === 'mixto' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Efectivo:</span>
                      <span>Bs {detalle.monto_efectivo}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">QR:</span>
                      <span>Bs {detalle.monto_qr}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-dorado/20 flex justify-between items-center">
                <span className="text-gray-400">TOTAL:</span>
                <span className="text-2xl font-display text-dorado">Bs {detalle.total}</span>
              </div>

              {detalle.notas && (
                <div className="pt-2 border-t border-dorado/20">
                  <p className="text-gray-400 mb-1">Notas:</p>
                  <p className="text-gray-300">{detalle.notas}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}