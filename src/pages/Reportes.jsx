import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Download, Users, Trophy, Eye } from 'lucide-react'
import { bobCorto } from '../lib/formato'
import { hoyBolivia, fechaBolivia } from '../lib/fecha'
import { generarPDF } from '../lib/pdf'

export default function Reportes() {
  const [desde, setDesde] = useState(hoyBolivia().slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoyBolivia())
  const [ayudanteFiltro, setAyudanteFiltro] = useState('todos')
  const [ayudantes, setAyudantes] = useState([])
  const [cortes, setCortes] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const cargarAyudantes = async () => {
      const { data } = await supabase.from('ayudantes').select('id, nombre').order('nombre')
      setAyudantes(data || [])
    }
    cargarAyudantes()
  }, [])

  const cargar = async () => {
    setCargando(true)

    let query = supabase
      .from('cortes')
      .select(`
        id, fecha, total, metodo_pago, monto_efectivo, monto_qr, cliente, created_at,
        ayudante:ayudantes(id, nombre),
        detalle:corte_detalle(nombre_servicio, precio)
      `)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    if (ayudanteFiltro !== 'todos') {
      query = query.eq('ayudante_id', ayudanteFiltro)
    }

    const { data } = await query
    setCortes(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [desde, hasta, ayudanteFiltro])

  const totalGeneral = cortes.reduce((s, c) => s + Number(c.total), 0)
  const nombreAyudante = ayudanteFiltro === 'todos'
    ? 'Todos los barberos'
    : ayudantes.find(a => a.id === ayudanteFiltro)?.nombre || ''

  const exportarPDF = async () => {
    await generarPDF({
      titulo: 'Reporte de Cortes',
      subtitulo: `${cortes.length} cortes registrados`,
      headers: ['Fecha', 'Barbero', 'Cliente', 'Servicios', 'Pago', 'Total'],
      rows: cortes.map(c => [
        fechaBolivia(c.fecha),
        c.ayudante?.nombre || '—',
        c.cliente || '—',
        c.detalle?.map(d => d.nombre_servicio).join(' + ') || '—',
        c.metodo_pago,
        bobCorto(c.total),
      ]),
      totales: {
        'Total cortes:': cortes.length,
        'TOTAL:': bobCorto(totalGeneral),
      },
      filtroInfo: `Del ${fechaBolivia(desde)} al ${fechaBolivia(hasta)} — ${nombreAyudante}`,
    })
    toast.success('PDF descargado')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold">Reportes de Cortes</h1>
          <p className="text-texto-suave text-sm mt-1">Vista previa del reporte filtrado</p>
        </div>

        {cortes.length > 0 && (
          <button onClick={exportarPDF}
            className="border-2 border-dorado text-dorado font-bold py-3 px-5 rounded-xl hover:bg-dorado/10 transition flex items-center gap-2">
            <Download size={18} /> Descargar PDF
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-texto-suave font-semibold block mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none" />
          </div>
          <div>
            <label className="text-xs text-texto-suave font-semibold block mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none" />
          </div>
          <div>
            <label className="text-xs text-texto-suave font-semibold block mb-1">Barbero</label>
            <select value={ayudanteFiltro} onChange={e => setAyudanteFiltro(e.target.value)}
              className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none">
              <option value="todos">Todos los barberos</option>
              {ayudantes.map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <button onClick={cargar}
            className="bg-dorado text-negro font-bold py-2.5 px-4 rounded-xl hover:bg-dorado-claro transition flex items-center justify-center gap-2">
            <Calendar size={18} /> Aplicar
          </button>
        </div>
      </div>

      {/* Vista previa del reporte */}
      {cargando ? (
        <p className="text-texto-muted text-center py-8">Cargando...</p>
      ) : cortes.length === 0 ? (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
          <Eye className="text-dorado/40 mx-auto mb-3" size={40} />
          <p className="text-texto-muted">No hay cortes en este rango</p>
        </div>
      ) : (
        <>
          {/* Resumen compacto arriba */}
          <div className="bg-dorado/5 border border-dorado/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-dorado text-xs uppercase tracking-wider font-bold">Vista previa</p>
              <p className="text-texto-suave text-sm">
                {fechaBolivia(desde)} → {fechaBolivia(hasta)} · {nombreAyudante}
              </p>
            </div>
            <div className="text-right">
              <p className="text-texto-suave text-xs">{cortes.length} cortes</p>
              <p className="text-2xl font-display text-dorado font-bold">{bobCorto(totalGeneral)}</p>
            </div>
          </div>

          {/* Tabla preview */}
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-negro border-b border-dorado/20">
                  <tr className="text-left text-texto-suave">
                    <th className="p-3 font-semibold">Fecha</th>
                    <th className="p-3 font-semibold">Barbero</th>
                    <th className="p-3 font-semibold">Cliente</th>
                    <th className="p-3 font-semibold">Servicios</th>
                    <th className="p-3 font-semibold">Pago</th>
                    <th className="p-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cortes.map(c => (
                    <tr key={c.id} className="border-b border-dorado/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-texto-suave whitespace-nowrap">{fechaBolivia(c.fecha)}</td>
                      <td className="p-3 font-semibold text-dorado whitespace-nowrap">{c.ayudante?.nombre || '—'}</td>
                      <td className="p-3 text-texto-suave">{c.cliente || <span className="text-texto-muted italic">—</span>}</td>
                      <td className="p-3 text-texto-suave max-w-xs">
                        {c.detalle?.map(d => d.nombre_servicio).join(', ') || '—'}
                      </td>
                      <td className="p-3 text-texto-suave capitalize">{c.metodo_pago}</td>
                      <td className="p-3 text-right font-bold text-dorado whitespace-nowrap">{bobCorto(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-negro border-t-2 border-dorado/40">
                  <tr>
                    <td colSpan="5" className="p-3 text-right font-bold text-texto-suave">
                      TOTAL
                    </td>
                    <td className="p-3 text-right font-display text-lg text-dorado font-bold whitespace-nowrap">
                      {bobCorto(totalGeneral)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Ranking ayudantes (solo si "todos") */}
          {ayudanteFiltro === 'todos' && (
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
              <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
                <Users className="text-dorado" size={20} /> Resumen por barbero
              </h2>
              <ResumenBarberos cortes={cortes} />
            </div>
          )}

          {/* Ranking servicios */}
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
              <Trophy className="text-dorado" size={20} /> Servicios más vendidos
            </h2>
            <ResumenServicios cortes={cortes} />
          </div>
        </>
      )}
    </div>
  )
}

function ResumenBarberos({ cortes }) {
  const porAyudante = {}
  cortes.forEach(c => {
    const nombre = c.ayudante?.nombre || '—'
    if (!porAyudante[nombre]) porAyudante[nombre] = { cortes: 0, total: 0 }
    porAyudante[nombre].cortes++
    porAyudante[nombre].total += Number(c.total)
  })
  const ranking = Object.entries(porAyudante)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-2">
      {ranking.map((a, i) => (
        <div key={a.nombre} className="flex items-center gap-3 bg-negro-card border border-dorado/10 rounded-xl p-3.5">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            i === 0 ? 'bg-dorado text-negro' : 'bg-negro text-dorado'
          }`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{a.nombre}</p>
            <p className="text-xs text-texto-muted">{a.cortes} cortes</p>
          </div>
          <p className="text-dorado font-bold text-lg">{bobCorto(a.total)}</p>
        </div>
      ))}
    </div>
  )
}

function ResumenServicios({ cortes }) {
  const porServicio = {}
  cortes.forEach(c => {
    c.detalle?.forEach(d => {
      if (!porServicio[d.nombre_servicio]) porServicio[d.nombre_servicio] = { cantidad: 0, total: 0 }
      porServicio[d.nombre_servicio].cantidad++
      porServicio[d.nombre_servicio].total += Number(d.precio)
    })
  })
  const ranking = Object.entries(porServicio)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)

  if (ranking.length === 0) return <p className="text-texto-muted text-sm text-center py-4">Sin datos</p>

  return (
    <div className="space-y-2">
      {ranking.map(s => (
        <div key={s.nombre} className="flex items-center justify-between bg-negro-card border border-dorado/10 rounded-xl p-3.5">
          <div>
            <p className="font-semibold">{s.nombre}</p>
            <p className="text-xs text-texto-muted">{s.cantidad} veces</p>
          </div>
          <p className="text-dorado font-bold">{bobCorto(s.total)}</p>
        </div>
      ))}
    </div>
  )
}