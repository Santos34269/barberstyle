import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, TrendingUp, Users, DollarSign, QrCode, Download, Trophy } from 'lucide-react'
import { bob, bobCorto } from '../lib/formato'
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
        id, fecha, total, metodo_pago, monto_efectivo, monto_qr, cliente,
        ayudante:ayudantes(id, nombre),
        detalle:corte_detalle(nombre_servicio, precio)
      `)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })

    if (ayudanteFiltro !== 'todos') {
      query = query.eq('ayudante_id', ayudanteFiltro)
    }

    const { data } = await query
    setCortes(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [desde, hasta, ayudanteFiltro])

  const totalGeneral = cortes.reduce((s, c) => s + Number(c.total), 0)
  const totalEfectivo = cortes.reduce((s, c) => s + Number(c.monto_efectivo || 0), 0)
  const totalQR = cortes.reduce((s, c) => s + Number(c.monto_qr || 0), 0)

  // Por ayudante
  const porAyudante = {}
  cortes.forEach(c => {
    const nombre = c.ayudante?.nombre || '—'
    if (!porAyudante[nombre]) porAyudante[nombre] = { cortes: 0, total: 0 }
    porAyudante[nombre].cortes++
    porAyudante[nombre].total += Number(c.total)
  })
  const rankingAyudantes = Object.entries(porAyudante)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.total - a.total)

  // Por servicio
  const porServicio = {}
  cortes.forEach(c => {
    c.detalle?.forEach(d => {
      if (!porServicio[d.nombre_servicio]) porServicio[d.nombre_servicio] = { cantidad: 0, total: 0 }
      porServicio[d.nombre_servicio].cantidad++
      porServicio[d.nombre_servicio].total += Number(d.precio)
    })
  })
  const rankingServicios = Object.entries(porServicio)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)

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
        'Efectivo:': bobCorto(totalEfectivo),
        'QR:': bobCorto(totalQR),
        'TOTAL:': bobCorto(totalGeneral),
      },
      filtroInfo: `Del ${fechaBolivia(desde)} al ${fechaBolivia(hasta)} — ${nombreAyudante}`,
    })
    toast.success('PDF descargado')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold">Reportes de Cortes</h1>
          <p className="text-texto-suave text-sm mt-1">Análisis por rango de fechas y barbero</p>
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

      {cargando ? (
        <p className="text-texto-muted">Cargando...</p>
      ) : (
        <>
          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <TrendingUp className="text-dorado mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Cortes</p>
              <p className="text-2xl font-display text-dorado font-bold">{cortes.length}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <DollarSign className="text-exito mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Total</p>
              <p className="text-xl font-display text-exito font-bold">{bobCorto(totalGeneral)}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <DollarSign className="text-info mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Efectivo</p>
              <p className="text-xl font-display text-info font-bold">{bobCorto(totalEfectivo)}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <QrCode className="text-dorado mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">QR</p>
              <p className="text-xl font-display text-dorado font-bold">{bobCorto(totalQR)}</p>
            </div>
          </div>

          {/* Ranking ayudantes */}
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
              <Users className="text-dorado" size={20} /> Por barbero
            </h2>
            {rankingAyudantes.length === 0 ? (
              <p className="text-texto-muted text-sm py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {rankingAyudantes.map((a, i) => (
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
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-dorado/20">
                  <span className="text-texto-suave font-semibold">TOTAL</span>
                  <span className="text-dorado font-display text-xl font-bold">
                    {cortes.length} cortes — {bobCorto(totalGeneral)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ranking servicios */}
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
              <Trophy className="text-dorado" size={20} /> Servicios más vendidos
            </h2>
            {rankingServicios.length === 0 ? (
              <p className="text-texto-muted text-sm py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {rankingServicios.map(s => (
                  <div key={s.nombre} className="flex items-center justify-between bg-negro-card border border-dorado/10 rounded-xl p-3.5">
                    <div>
                      <p className="font-semibold">{s.nombre}</p>
                      <p className="text-xs text-texto-muted">{s.cantidad} veces</p>
                    </div>
                    <p className="text-dorado font-bold">{bobCorto(s.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}