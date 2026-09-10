import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { bob, bobCorto } from '../lib/formato'
import {
  Scissors, DollarSign, TrendingUp, QrCode, Users,
  Trophy, Clock, ArrowRight, Calendar
} from 'lucide-react'

export default function Dashboard() {
  const { perfil, isCajero } = useAuth()
  const [stats, setStats] = useState({
    hoy: 0, montoHoy: 0, mes: 0, montoMes: 0,
    efectivo: 0, qr: 0, ticketPromedio: 0, variacion: 0,
  })
  const [topBarberos, setTopBarberos] = useState([])
  const [recientes, setRecientes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const hoy = new Date().toISOString().slice(0, 10)
      const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10)

      // Cortes de hoy
      const { data: hoyData } = await supabase
        .from('cortes')
        .select('total, monto_efectivo, monto_qr')
        .eq('fecha', hoy)

      // Cortes de ayer (para variación)
      const { data: ayerData } = await supabase
        .from('cortes')
        .select('total')
        .eq('fecha', ayer)

      // Cortes del mes
      const { data: mesData } = await supabase
        .from('cortes')
        .select('total')
        .gte('fecha', inicioMes)

      // Cortes del mes con barbero (ranking)
      const { data: mesConBarbero } = await supabase
        .from('cortes')
        .select('total, ayudante:ayudantes(nombre)')
        .gte('fecha', inicioMes)

      // Últimos 5 cortes
      const { data: recientesData } = await supabase
        .from('cortes')
        .select('id, fecha, total, metodo_pago, created_at, ayudante:ayudantes(nombre)')
        .order('created_at', { ascending: false })
        .limit(5)

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

      setRecientes(recientesData || [])
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
          icon: DollarSign,
          label: 'Efectivo',
          value: bobCorto(stats.efectivo),
          colorClass: 'text-info',
          bgClass: 'bg-info/10',
        },
        {
          icon: QrCode,
          label: 'QR',
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
          <p className="text-texto-suave text-sm mt-1 flex items-center gap-2">
            <Calendar size={14} className="text-dorado" />
            {new Date().toLocaleDateString('es-BO', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <Link
          to="/registrar"
          className="inline-flex items-center gap-2 bg-dorado text-negro font-bold px-5 py-3 rounded-xl hover:bg-dorado-claro transition shadow-lg shadow-dorado/20"
        >
          <Scissors size={18} /> Registrar corte
        </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <div
              key={i}
              className="bg-negro-suave border border-dorado/15 rounded-2xl p-5 hover:border-dorado/40 hover:bg-negro-card transition-all"
            >
              <div className={`w-11 h-11 rounded-xl ${c.bgClass} flex items-center justify-center mb-3`}>
                <c.icon className={c.colorClass} size={22} strokeWidth={2.3} />
              </div>
              <p className="text-texto-suave text-[13px] font-medium mb-1">{c.label}</p>
              <p className={`font-display text-2xl font-bold ${c.colorClass}`}>{c.value}</p>
              {c.sub && (
                <p className="text-[11px] text-texto-muted mt-1">{c.sub}</p>
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
                        <p className="font-semibold text-texto">{b.nombre}</p>
                        <p className="text-xs text-texto-muted">{b.cortes} cortes</p>
                      </div>
                      <p className="font-display text-dorado font-bold text-lg">
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
                    <p className="text-sm font-medium text-texto truncate">
                      {r.ayudante?.nombre || 'Barbero'}
                    </p>
                    <p className="text-[11px] text-texto-muted">
                      {new Date(r.created_at).toLocaleTimeString('es-BO', {
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