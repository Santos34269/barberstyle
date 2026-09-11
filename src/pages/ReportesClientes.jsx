import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Star, Trophy, Download, Users, Scissors, DollarSign } from 'lucide-react'
import { bob, bobCorto } from '../lib/formato'
import { fechaBolivia } from '../lib/fecha'
import { generarPDF } from '../lib/pdf'

export default function ReportesClientes() {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)

    // Traer todos los cortes con cliente
    const { data } = await supabase
      .from('cortes')
      .select('cliente, total, fecha')
      .not('cliente', 'is', null)
      .order('fecha', { ascending: false })

    const agrupado = {}
    data?.forEach(c => {
      const n = c.cliente?.trim()
      if (!n) return
      if (!agrupado[n]) {
        agrupado[n] = { nombre: n, visitas: 0, total: 0, ultima: c.fecha }
      }
      agrupado[n].visitas++
      agrupado[n].total += Number(c.total)
      if (c.fecha > agrupado[n].ultima) agrupado[n].ultima = c.fecha
    })

    // ✅ DESEMPATE: primero por visitas DESC, si empatan por total DESC
    const ranking = Object.values(agrupado).sort((a, b) => {
      if (b.visitas !== a.visitas) return b.visitas - a.visitas
      return b.total - a.total
    })

    setClientes(ranking)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const top10 = clientes.slice(0, 10)

  const exportarPDF = async () => {
    await generarPDF({
      titulo: 'Top Clientes Más Fieles',
      subtitulo: `Ranking de los ${top10.length} clientes con más visitas`,
      headers: ['#', 'Cliente', 'Visitas', 'Total gastado', 'Última visita'],
      rows: top10.map((c, i) => [
        i + 1,
        c.nombre,
        c.visitas,
        bobCorto(c.total),
        fechaBolivia(c.ultima),
      ]),
      totales: {
        'Clientes registrados:': clientes.length,
        'Total visitas:': clientes.reduce((s, c) => s + c.visitas, 0),
        'Total facturado:': bobCorto(clientes.reduce((s, c) => s + c.total, 0)),
      },
      filtroInfo: 'Ranking histórico — desempate por total gastado',
    })
    toast.success('PDF descargado')
  }

  const medallas = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold flex items-center gap-3">
            <Star /> Clientes Más Fieles
          </h1>
          <p className="text-texto-suave text-sm mt-1">
            Top 10 — ideal para regalos de Navidad 🎁
          </p>
        </div>

        {top10.length > 0 && (
          <button onClick={exportarPDF}
            className="border-2 border-dorado text-dorado font-bold py-3 px-5 rounded-xl hover:bg-dorado/10 transition flex items-center gap-2">
            <Download size={18} /> Descargar PDF
          </button>
        )}
      </div>

      {cargando ? (
        <p className="text-texto-muted">Cargando...</p>
      ) : clientes.length === 0 ? (
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-8 text-center">
          <Users className="text-dorado/40 mx-auto mb-3" size={40} />
          <p className="text-texto-muted">Aún no hay clientes registrados</p>
          <p className="text-texto-muted text-xs mt-1">
            Los clientes aparecen cuando registras un corte con nombre
          </p>
        </div>
      ) : (
        <>
          {/* Stats generales */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <Users className="text-dorado mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Clientes</p>
              <p className="text-2xl font-display text-dorado font-bold">{clientes.length}</p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4">
              <Scissors className="text-info mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Visitas totales</p>
              <p className="text-2xl font-display text-info font-bold">
                {clientes.reduce((s, c) => s + c.visitas, 0)}
              </p>
            </div>
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-4 col-span-2 md:col-span-1">
              <DollarSign className="text-exito mb-2" size={22} />
              <p className="text-xs text-texto-suave font-semibold">Facturado</p>
              <p className="text-xl font-display text-exito font-bold">
                {bobCorto(clientes.reduce((s, c) => s + c.total, 0))}
              </p>
            </div>
          </div>

          {/* Top 10 */}
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <h2 className="font-display text-lg text-texto font-bold mb-4 flex items-center gap-2">
              <Trophy className="text-dorado" size={20} /> Top 10 — Clientes frecuentes
            </h2>
            <div className="space-y-2">
              {top10.map((c, i) => (
                <div key={c.nombre}
                  className={`flex items-center gap-3 rounded-xl p-3.5 border ${
                    i < 3
                      ? 'bg-dorado/5 border-dorado/40'
                      : 'bg-negro-card border-dorado/10'
                  }`}>
                  <span className="text-2xl w-8 text-center">
                    {i < 3 ? medallas[i] : <span className="text-dorado font-bold">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-texto truncate">{c.nombre}</p>
                    <p className="text-xs text-texto-muted">
                      Última visita: {fechaBolivia(c.ultima)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-dorado font-bold text-lg">{c.visitas}</p>
                    <p className="text-[10px] text-texto-muted">visitas</p>
                  </div>
                  <div className="text-right shrink-0 hidden md:block">
                    <p className="text-exito font-bold">{bobCorto(c.total)}</p>
                    <p className="text-[10px] text-texto-muted">gastado</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resto */}
          {clientes.length > 10 && (
            <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
              <h2 className="font-display text-base text-texto-suave font-bold mb-3">
                Otros clientes ({clientes.length - 10})
              </h2>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {clientes.slice(10).map(c => (
                  <div key={c.nombre} className="flex items-center justify-between py-2 border-b border-dorado/5 last:border-0">
                    <p className="text-sm text-texto-suave truncate flex-1">{c.nombre}</p>
                    <span className="text-xs text-texto-muted ml-3">{c.visitas} visitas</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}