import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Download, Package, TrendingUp, DollarSign } from 'lucide-react'
import { bob, bobCorto } from '../lib/formato'
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
    let query = supabase
      .from('ventas_productos')
      .select('*, producto:productos(categoria)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })

    const { data } = await query
    let resultado = data || []

    if (categoria !== 'todos') {
      resultado = resultado.filter(v => v.producto?.categoria === categoria)
    }

    setVentas(resultado)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const totalVentas = ventas.reduce((s, v) => s + Number(v.total), 0)
  const totalItems = ventas.reduce((s, v) => s + v.cantidad, 0)
  const totalEfectivo = ventas.reduce((s, v) => s + Number(v.monto_efectivo || 0), 0)
  const totalQR = ventas.reduce((s, v) => s + Number(v.monto_qr || 0), 0)

  // Ranking por producto
  const porProducto = {}
  ventas.forEach(v => {
    if (!porProducto[v.nombre_producto]) {
      porProducto[v.nombre_producto] = { cantidad: 0, total: 0 }
    }
    porProducto[v.nombre_producto].cantidad += v.cantidad
    porProducto[v.nombre_producto].total += Number(v.total)
  })
  const rankingProductos = Object.entries(porProducto)
    .map(([nombre, d]) => ({ nombre, ...d }))
    .sort((a, b) => b.total - a.total)

  const exportarPDF = async () => {
    await generarPDF({
      titulo: 'Reporte de Ventas de Productos',
      subtitulo: `${ventas.length} ventas registradas`,
      headers: ['Fecha', 'Producto', 'Cant.', 'P. Unit.', 'Método', 'Total'],
      rows: ventas.map(v => [
        fechaBolivia(v.fecha),
        v.nombre_producto,
        v.cantidad,
        bobCorto(v.precio_unitario),
        v.metodo_pago,
        bobCorto(v.total),
      ]),
      totales: {
        'Total ventas:': ventas.length,
        'Ítems vendidos:': totalItems,
        'Efectivo:': bobCorto(totalEfectivo),
        'QR:': bobCorto(totalQR),
        'TOTAL:': bobCorto(totalVentas),
      },
      filtroInfo: `Del ${fechaBolivia(desde)} al ${fechaBolivia(hasta)} — Categoría: ${
        categoria === 'todos' ? 'Todas' : categoria
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
          <p className="text-texto-suave text-sm mt-1">Ventas de cuidado y bebidas</p>
        </div>
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

        {ventas.length > 0 && (
          <button onClick={exportarPDF}
            className="mt-3 w-full border-2 border-dorado text-dorado font-bold py-2.5 px-4 rounded-xl hover:bg-dorado/10 transition flex items-center justify-center gap-2">
            <Download size={18} /> Descargar PDF profesional
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-texto-muted">Cargando...</p>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <Package className="text-dorado mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Ventas</p>
              <p className="text-2xl font-display text-dorado font-bold">{ventas.length}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <TrendingUp className="text-info mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Ítems vendidos</p>
              <p className="text-2xl font-display text-info font-bold">{totalItems}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <DollarSign className="text-exito mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Ingresos</p>
              <p className="text-xl font-display text-exito font-bold">{bobCorto(totalVentas)}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <DollarSign className="text-dorado mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Ticket prom.</p>
              <p className="text-xl font-display text-dorado font-bold">
                {ventas.length > 0 ? bobCorto(totalVentas / ventas.length) : bobCorto(0)}
              </p>
            </div>
          </div>

          {/* Ranking productos */}
          {rankingProductos.length > 0 && (
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
              <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="text-dorado" size={20} /> Top productos
              </h2>
              <div className="space-y-2">
                {rankingProductos.slice(0, 10).map((p, i) => (
                  <div key={p.nombre} className="flex items-center gap-3 bg-negro-card border border-dorado/10 rounded-xl p-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      i === 0 ? 'bg-dorado text-negro' : 'bg-negro text-dorado'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.nombre}</p>
                      <p className="text-xs text-texto-muted">{p.cantidad} unidades</p>
                    </div>
                    <p className="text-dorado font-bold">{bobCorto(p.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ventas.length === 0 && (
            <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
              <Package className="text-dorado/40 mx-auto mb-3" size={40} />
              <p className="text-texto-muted">No hay ventas en este rango</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}