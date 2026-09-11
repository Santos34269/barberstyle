import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Download, Package, TrendingUp, Eye } from 'lucide-react'
import { bobCorto } from '../lib/formato'
import { hoyBolivia, fechaBolivia } from '../lib/fecha'
import { generarPDF } from '../lib/pdf'

export default function ReportesProductos() {
  const [desde, setDesde] = useState(hoyBolivia().slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoyBolivia())
  const [categoria, setCategoria] = useState('todos')
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('ventas_productos')
      .select('*, producto:productos(categoria)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })

    let resultado = data || []

    if (categoria !== 'todos') {
      resultado = resultado.filter(v => v.producto?.categoria === categoria)
    }

    setVentas(resultado)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [desde, hasta, categoria])

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)
  const totalItems = ventas.reduce((s, v) => s + v.cantidad, 0)

  const exportarPDF = async () => {
    await generarPDF({
      titulo: 'Reporte de Ventas de Productos',
      subtitulo: `${ventas.length} ventas registradas — ${totalItems} ítems vendidos`,
      headers: ['Fecha', 'Producto', 'Cant.', 'P. Unit.', 'Pago', 'Efectivo', 'QR', 'Total'],
      rows: ventas.map(v => [
        fechaBolivia(v.fecha),
        v.nombre_producto,
        v.cantidad,
        bobCorto(v.precio_unitario),
        v.metodo_pago,
        v.metodo_pago === 'efectivo' ? bobCorto(v.total)
          : v.metodo_pago === 'qr' ? '—'
          : bobCorto(v.monto_efectivo || 0),
        v.metodo_pago === 'qr' ? bobCorto(v.total)
          : v.metodo_pago === 'efectivo' ? '—'
          : bobCorto(v.monto_qr || 0),
        bobCorto(v.total),
      ]),
      totales: {
        'Total ventas:': ventas.length,
        'Ítems vendidos:': totalItems,
        'TOTAL:': bobCorto(totalVentas),
      },
      filtroInfo: `Del ${fechaBolivia(desde)} al ${fechaBolivia(hasta)} — Categoría: ${
        categoria === 'todos' ? 'Todas' : categoria === 'cuidado' ? 'Cuidado' : 'Bebidas'
      }`,
    })
    toast.success('PDF descargado')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold flex items-center gap-3">
            <Package /> Reportes de Productos
          </h1>
          <p className="text-texto-suave text-sm mt-1">Vista previa del reporte filtrado</p>
        </div>

        {ventas.length > 0 && (
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
            <label className="text-xs text-texto-suave font-semibold block mb-1">Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-2.5 outline-none">
              <option value="todos">Todas</option>
              <option value="cuidado">🧴 Cuidado</option>
              <option value="bebida">🥤 Bebidas</option>
            </select>
          </div>
          <button onClick={cargar}
            className="bg-dorado text-negro font-bold py-2.5 px-4 rounded-xl hover:bg-dorado-claro transition flex items-center justify-center gap-2">
            <Calendar size={18} /> Aplicar
          </button>
        </div>
      </div>

      {cargando ? (
        <p className="text-texto-muted text-center py-8">Cargando...</p>
      ) : ventas.length === 0 ? (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
          <Eye className="text-dorado/40 mx-auto mb-3" size={40} />
          <p className="text-texto-muted">No hay ventas en este rango</p>
        </div>
      ) : (
        <>
          {/* Resumen compacto */}
          <div className="bg-dorado/5 border border-dorado/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-dorado text-xs uppercase tracking-wider font-bold">Vista previa</p>
              <p className="text-texto-suave text-sm">
                {fechaBolivia(desde)} → {fechaBolivia(hasta)} · {categoria === 'todos' ? 'Todas las categorías' : categoria}
              </p>
            </div>
            <div className="text-right">
              <p className="text-texto-suave text-xs">{ventas.length} ventas · {totalItems} ítems</p>
              <p className="text-2xl font-display text-dorado font-bold">{bobCorto(totalVentas)}</p>
            </div>
          </div>

          {/* Tabla preview */}
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-negro border-b border-dorado/20">
                  <tr className="text-left text-texto-suave">
                    <th className="p-3 font-semibold">Fecha</th>
                    <th className="p-3 font-semibold">Producto</th>
                    <th className="p-3 font-semibold text-center">Cant.</th>
                    <th className="p-3 font-semibold text-right">P. Unit.</th>
                    <th className="p-3 font-semibold">Pago</th>
                    <th className="p-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id} className="border-b border-dorado/5 hover:bg-white/[0.02]">
                      <td className="p-3 text-texto-suave whitespace-nowrap">{fechaBolivia(v.fecha)}</td>
                      <td className="p-3 font-semibold text-dorado">{v.nombre_producto}</td>
                      <td className="p-3 text-center text-texto-suave">{v.cantidad}</td>
                      <td className="p-3 text-right text-texto-suave whitespace-nowrap">{bobCorto(v.precio_unitario)}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 rounded border uppercase font-bold text-dorado border-dorado/40 bg-dorado/5">
                          {v.metodo_pago}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-dorado whitespace-nowrap">{bobCorto(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-negro border-t-2 border-dorado/40">
                  <tr>
                    <td colSpan="5" className="p-3 text-right font-bold text-texto-suave">TOTAL</td>
                    <td className="p-3 text-right font-display text-lg text-dorado font-bold whitespace-nowrap">
                      {bobCorto(totalVentas)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Top productos */}
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-dorado" size={20} /> Top productos vendidos
            </h2>
            <ResumenProductos ventas={ventas} />
          </div>
        </>
      )}
    </div>
  )
}

function ResumenProductos({ ventas }) {
  const porProducto = {}
  ventas.forEach(v => {
    if (!porProducto[v.nombre_producto]) {
      porProducto[v.nombre_producto] = { cantidad: 0, total: 0 }
    }
    porProducto[v.nombre_producto].cantidad += v.cantidad
    porProducto[v.nombre_producto].total += Number(v.total)
  })
  const ranking = Object.entries(porProducto)
    .map(([nombre, data]) => ({ nombre, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)

  return (
    <div className="space-y-2">
      {ranking.map((p, i) => (
        <div key={p.nombre} className="flex items-center gap-3 bg-negro-card border border-dorado/10 rounded-xl p-3.5">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            i === 0 ? 'bg-dorado text-negro' : 'bg-negro text-dorado'
          }`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.nombre}</p>
            <p className="text-xs text-texto-muted">{p.cantidad} unidades</p>
          </div>
          <p className="text-dorado font-bold">{bobCorto(p.total)}</p>
        </div>
      ))}
    </div>
  )
}