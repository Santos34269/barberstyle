import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, TrendingUp, Users, DollarSign, QrCode, Download } from 'lucide-react'

export default function Reportes() {
  const hoy = new Date().toISOString().slice(0, 10)
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [desde, setDesde] = useState(inicioMes)
  const [hasta, setHasta] = useState(hoy)
  const [cortes, setCortes] = useState([])
  const [cargando, setCargando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('cortes')
      .select(`
        id, fecha, total, metodo_pago, monto_efectivo, monto_qr,
        ayudante:ayudantes(nombre),
        detalle:corte_detalle(nombre_servicio, precio)
      `)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
    setCortes(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  // Totales generales
  const totalGeneral = cortes.reduce((s, c) => s + Number(c.total), 0)
  const totalEfectivo = cortes.reduce((s, c) => s + Number(c.monto_efectivo), 0)
  const totalQR = cortes.reduce((s, c) => s + Number(c.monto_qr), 0)

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

  const exportarCSV = () => {
    const filas = [
      ['Fecha', 'Barbero', 'Servicios', 'Método', 'Efectivo', 'QR', 'Total'],
      ...cortes.map(c => [
        c.fecha,
        c.ayudante?.nombre || '',
        c.detalle?.map(d => d.nombre_servicio).join(' + ') || '',
        c.metodo_pago,
        c.monto_efectivo,
        c.monto_qr,
        c.total,
      ]),
    ]
    const csv = filas.map(f => f.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_${desde}_${hasta}.csv`
    a.click()
    toast.success('Reporte descargado')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-dorado">Reportes</h1>
        <p className="text-gray-400 text-sm">Analiza el rendimiento por rango de fechas</p>
      </div>

      {/* Filtros */}
      <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
          </div>
          <button onClick={cargar}
            className="bg-dorado text-negro font-semibold py-2.5 px-4 rounded-lg hover:bg-dorado-claro transition flex items-center justify-center gap-2">
            <Calendar size={18} /> Aplicar
          </button>
          <button onClick={exportarCSV} disabled={cortes.length === 0}
            className="border border-dorado text-dorado font-semibold py-2.5 px-4 rounded-lg hover:bg-dorado/10 transition flex items-center justify-center gap-2 disabled:opacity-40">
            <Download size={18} /> CSV
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          {/* Totales generales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
              <TrendingUp className="text-dorado mb-2" size={24} />
              <p className="text-xs text-gray-400">Cortes</p>
              <p className="text-2xl font-display text-dorado">{cortes.length}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
              <DollarSign className="text-green-400 mb-2" size={24} />
              <p className="text-xs text-gray-400">Total generado</p>
              <p className="text-2xl font-display text-green-400">Bs {totalGeneral}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
              <DollarSign className="text-blue-400 mb-2" size={24} />
              <p className="text-xs text-gray-400">Efectivo</p>
              <p className="text-2xl font-display text-blue-400">Bs {totalEfectivo}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
              <QrCode className="text-purple-400 mb-2" size={24} />
              <p className="text-xs text-gray-400">QR</p>
              <p className="text-2xl font-display text-purple-400">Bs {totalQR}</p>
            </div>
          </div>

          {/* Ranking por ayudante */}
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-5 mb-6">
            <h2 className="font-display text-xl text-dorado mb-4 flex items-center gap-2">
              <Users size={20} /> Por ayudante
            </h2>
            {rankingAyudantes.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos en este rango</p>
            ) : (
              <div className="space-y-2">
                {rankingAyudantes.map((a, i) => (
                  <div key={a.nombre} className="flex items-center gap-3 bg-negro rounded-lg p-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-dorado text-negro' : 'bg-gray-800 text-dorado'
                    }`}>{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{a.nombre}</p>
                      <p className="text-xs text-gray-500">{a.cortes} cortes</p>
                    </div>
                    <p className="text-dorado font-bold text-lg">Bs {a.total}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-dorado/20">
                  <span className="text-gray-400">TOTAL</span>
                  <span className="text-dorado font-display text-2xl">
                    {cortes.length} cortes — Bs {totalGeneral}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ranking por servicio */}
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-5">
            <h2 className="font-display text-xl text-dorado mb-4">Por servicio</h2>
            {rankingServicios.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos en este rango</p>
            ) : (
              <div className="space-y-2">
                {rankingServicios.map(s => (
                  <div key={s.nombre} className="flex items-center justify-between bg-negro rounded-lg p-3">
                    <div>
                      <p className="font-semibold">{s.nombre}</p>
                      <p className="text-xs text-gray-500">{s.cantidad} veces</p>
                    </div>
                    <p className="text-dorado font-bold">Bs {s.total}</p>
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