import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { bob, bobCorto } from '../lib/formato'
import { horaBolivia, hoyBolivia } from '../lib/fecha'
import {
  Scissors, DollarSign, TrendingUp, QrCode, Users,
  Trophy, Clock, ArrowRight, Calendar, ShoppingBag
} from 'lucide-react'

export default function Dashboard() {
  const { perfil, isCajero } = useAuth()
  const [stats, setStats] = useState({
    hoy: 0, montoHoy: 0, mes: 0, montoMes: 0,
    efectivo: 0, qr: 0, ticketPromedio: 0, variacion: 0,
    productosHoy: 0, montoProductosHoy: 0,
  })
  const [topBarberos, setTopBarberos] = useState([])
  const [recientes, setRecientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [horaActual, setHoraActual] = useState(horaBolivia())

  // Reloj en vivo (hora Bolivia)
  useEffect(() => {
    const t = setInterval(() => setHoraActual(horaBolivia()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const cargar = async () => {
      const hoy = hoyBolivia()
      const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const inicioMes = hoy.slice(0, 8) + '01'

      // Cortes de hoy
      const { data: hoyData } = await supabase
        .from('cortes')
        .select('total, monto_efectivo, monto_qr')
        .eq('fecha', hoy)

      // Cortes de ayer
      const { data: ayerData } = await supabase
        .from('cortes')
        .select('total')
        .eq('fecha', ayer)

      // Cortes del mes
      const { data: mesData } = await supabase
        .from('cortes')
        .select('total')
        .gte('fecha', inicioMes)

      // Cortes del mes con barbero
      const { data: mesConBarbero } = await supabase
        .from('cortes')
        .select('total, ayudante:ayudantes(nombre)')
        .gte('fecha', inicioMes)

      // Últimos 5 cortes
      const { data: recientesCortes } = await supabase
        .from('cortes')
        .select('id, fecha, total, metodo_pago, created_at, cliente, ayudante:ayudantes(nombre)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Productos vendidos hoy
      const { data: productosHoyData } = await supabase
        .from('ventas_productos')
        .select('total')
        .eq('fecha', hoy)

      const totalHoy = hoyData?.reduce((s, c) => s + Number(c.total), 0) || 0
      const totalAyer = ayerData?.reduce((s, c) => s + Number(c.total), 0) || 0
      const totalMes = mesData?.reduce((s, c) => s + Number(c.total), 0) || 0
      const cantHoy = hoyData?.length || 0

      const variacion = totalAyer > 0
        ? ((totalHoy - totalAyer) / totalAyer) * 100
        : 0

      setStats({
        hoy: cantHoy,
        montoHoy: totalHoy,
        mes: mesData?.length || 0,
        montoMes: totalMes,
        efectivo: hoyData?.reduce((s, c) => s + Number(c.monto_efectivo), 0) || 0,
        qr: hoyData?.reduce((s, c) => s + Number(c.monto_qr), 0) || 0,
        ticketPromedio: cantHoy > 0 ? totalHoy / cantHoy : 0,
        variacion: Number(variacion.toFixed(1)),
        productosHoy: productosHoyData?.length || 0,
        montoProductosHoy: productosHoyData?.reduce((s, c) => s + Number(c.total), 0) || 0,
      })

      // Ranking ayudantes
      const rank = {}
      mesConBarbero?.forEach(c => {
        const n = c.ayudante?.nombre || '—'
        if (!rank[n]) rank[n] = { cortes: 0, total: 0 }
        rank[n].cortes++
        rank[n].total += Number(c.total)
      })
      setTopBarberos(
        Object.entries(rank)
          .map(([nombre, d]) => ({ nombre, ...d }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
      )

      setRecientes(recientesCortes || [])
      setCargando(false)
    }
    cargar()
  }, [])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  // ============ CARDS ============
  const cards = isCajero
    ? [
        {
          icon: Scissors,
          label: 'Cortes hoy',
          value: stats.hoy,
          colorClass: 'text-dorado',
          bgClass: 'bg-dorado/10',
        },
        {
          icon: DollarSign,
          label: 'Ingreso hoy',
          value: bobCorto(stats.montoHoy),
          colorClass: 'text-exito',
          bgClass: 'bg-exito/10',
        },
        {
          icon: ShoppingBag,
          label: 'Productos vendidos',
          value: stats.productosHoy,
          colorClass: 'text-info',
          bgClass: 'bg-info/10',
        },
        {
          icon: QrCode,
          label: 'QR hoy',
          value: bobCorto(stats.qr),
          colorClass: 'text-dorado',
          bgClass: 'bg-dorado/10',
        },
      ]
    : [
        {
          icon: Scissors,
          label: 'Cortes hoy',
          value: stats.hoy,
          colorClass: 'text-dorado',
          bgClass: 'bg-dorado/10',
          sub: `${stats.variacion > 0 ? '+' : ''}${stats.variacion}% vs ayer`,
        },
        {
          icon: DollarSign,
          label: 'Ingreso hoy',
          value: bobCorto(stats.montoHoy),
          colorClass: 'text-exito',
          bgClass: 'bg-exito/10',
          sub: `Ticket prom. ${bobCorto(stats.ticketPromedio)}`,
        },
        {
          icon: TrendingUp,
          label: 'Cortes del mes',
          value: stats.mes,
          colorClass: 'text-dorado',
          bgClass: 'bg-dorado/10',
        },
        {
          icon: DollarSign,
          label: 'Ingreso del mes',
          value: bobCorto(stats.montoMes),
          colorClass: 'text-exito',
          bgClass: 'bg-exito/10',
        },
      ]

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-dorado text-sm font-semibold uppercase tracking-wider mb-1">
            {saludo}
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-texto font-bold">
            {perfil?.nombre_completo || perfil?.usuario}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-texto-suave text-sm mt-2">
            <span className="flex items-center gap-1.5 capitalize">
              <Calendar size={14} className="text-dorado" />
              {new Date().toLocaleDateString('es-BO', {
                timeZone: 'America/La_Paz',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5 text-dorado font-bold font-mono">
              <Clock size={14} /> {horaActual}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/registrar"
            className="inline-flex items-center gap-2 bg-dorado text-negro font-bold px-5 py-3 rounded-xl hover:bg-dorado-claro transition shadow-lg shadow-dorado/20 active:scale-[0.98]"
          >
            <Scissors size={18} /> Registrar corte
          </Link>
          <Link
            to="/vender"
            className="inline-flex items-center gap-2 border-2 border-dorado text-dorado font-bold px-5 py-3 rounded-xl hover:bg-dorado/10 transition active:scale-[0.98]"
          >
            <ShoppingBag size={18} /> Vender producto
          </Link>
        </div>
      </div>

      {/* ============ CARDS ============ */}
      {cargando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="bg-negro-suave border border-dorado/10 rounded-2xl p-5 animate-pulse h-32"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {cards.map((c, i) => (
            <div
              key={i}
              className="bg-negro-suave border border-dorado/15 rounded-2xl p-4 md:p-5 hover:border-dorado/40 hover:bg-negro-card transition-all"
            >
              <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${c.bgClass} flex items-center justify-center mb-3`}>
                <c.icon className={c.colorClass} size={20} strokeWidth={2.3} />
              </div>
              <p className="text-texto-suave text-xs md:text-[13px] font-semibold mb-1">{c.label}</p>
              <p className={`font-display text-lg md:text-2xl font-bold ${c.colorClass}`}>{c.value}</p>
              {c.sub && (
                <p className="text-[10px] md:text-[11px] text-texto-muted mt-1">{c.sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ============ GRID INFERIOR ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP BARBEROS */}
        {!isCajero && (
          <div className="bg-negro-suave border border-dorado/15 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-texto font-bold flex items-center gap-2">
                <Trophy className="text-dorado" size={20} />
                Top barberos del mes
              </h2>
            </div>

            {topBarberos.length === 0 ? (
              <p className="text-texto-muted text-sm py-6 text-center">
                Aún no hay cortes este mes
              </p>
            ) : (
              <div className="space-y-3">
                {topBarberos.map((b, i) => {
                  const medallas = ['🥇', '🥈', '🥉']
                  return (
                    <div
                      key={b.nombre}
                      className="flex items-center gap-3 bg-negro-card border border-dorado/10 rounded-xl p-3.5 hover:border-dorado/30 transition"
                    >
                      <span className="text-2xl">{medallas[i]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-texto truncate">{b.nombre}</p>
                        <p className="text-xs text-texto-muted">{b.cortes} cortes</p>
                      </div>
                      <p className="font-display text-dorado font-bold text-lg whitespace-nowrap">
                        {bobCorto(b.total)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVIDAD RECIENTE */}
        <div
          className={`bg-negro-suave border border-dorado/15 rounded-2xl p-5 ${
            isCajero ? 'lg:col-span-2' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-texto font-bold flex items-center gap-2">
              <Clock className="text-dorado" size={20} />
              Actividad reciente
            </h2>
            {!isCajero && (
              <Link
                to="/historial"
                className="text-dorado text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
              >
                Ver todo <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {recientes.length === 0 ? (
            <p className="text-texto-muted text-sm py-6 text-center">
              No hay actividad reciente
            </p>
          ) : (
            <div className="space-y-2">
              {recientes.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 py-2.5 border-b border-dorado/5 last:border-0"
                >
                  <div className="w-9 h-9 rounded-full bg-dorado/10 flex items-center justify-center shrink-0">
                    <Scissors className="text-dorado" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-texto truncate">
                      {r.ayudante?.nombre || 'Barbero'}
                      {r.cliente && <span className="text-texto-muted font-normal"> · {r.cliente}</span>}
                    </p>
                    <p className="text-[11px] text-texto-muted">
                      {new Date(r.created_at).toLocaleTimeString('es-BO', {
                        timeZone: 'America/La_Paz',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      <span className="capitalize">{r.metodo_pago}</span>
                    </p>
                  </div>
                  <p className="font-semibold text-dorado text-sm whitespace-nowrap">
                    {bobCorto(r.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ NOTA CAJERO ============ */}
      {isCajero && (
        <div className="bg-dorado/5 border border-dorado/25 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-dorado/15 flex items-center justify-center shrink-0">
            <Users className="text-dorado" size={18} />
          </div>
          <div>
            <p className="text-dorado font-semibold text-sm">Vista de cajero</p>
            <p className="text-texto-suave text-sm mt-0.5">
              Estás viendo el resumen global del día. Todos los barberos incluidos.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}