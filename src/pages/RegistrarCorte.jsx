import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Check, DollarSign, QrCode, Split, User } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../hooks/useAuth'
import { bob, bobCorto } from '../lib/formato'
import { hoyBolivia } from '../lib/fecha'

export default function RegistrarCorte() {
  const { perfil, isCajero } = useAuth()
  const [ayudantes, setAyudantes] = useState([])
  const [servicios, setServicios] = useState([])
  const [fecha, setFecha] = useState(hoyBolivia())
  const [ayudanteId, setAyudanteId] = useState('')
  const [cliente, setCliente] = useState('')
  const [seleccionados, setSeleccionados] = useState({})
  const [metodo, setMetodo] = useState('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoQR, setMontoQR] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: a } = await supabase.from('ayudantes').select('*').eq('activo', true).order('nombre')
      const { data: s } = await supabase.from('servicios').select('*').eq('activo', true).order('nombre')
      setAyudantes(a || [])
      setServicios(s || [])
    }
    cargar()
  }, [])

  const toggleServicio = (id) => setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }))

  const serviciosElegidos = servicios.filter(s => seleccionados[s.id])
  const total = serviciosElegidos.reduce((sum, s) => sum + Number(s.precio), 0)
  const barberoNombre = ayudantes.find(a => a.id === ayudanteId)?.nombre || '—'

  const prepararConfirmacion = async (e) => {
    e.preventDefault()
    if (!ayudanteId) return toast.error('Selecciona un barbero')
    if (serviciosElegidos.length === 0) return toast.error('Selecciona al menos un servicio')

    // Validar cliente duplicado
    if (cliente.trim()) {
      const nombreNorm = cliente.trim()
      const { data: existente } = await supabase
        .from('clientes')
        .select('nombre')
        .ilike('nombre', nombreNorm)
        .maybeSingle()

      if (existente && existente.nombre.toLowerCase() === nombreNorm.toLowerCase()) {
        return toast.error(`El cliente "${nombreNorm}" ya existe. Usa el nombre completo si es otra persona.`)
      }
    }

    if (metodo === 'mixto') {
      const ef = Number(montoEfectivo) || 0
      const qr = Number(montoQR) || 0
      if (ef + qr !== total) {
        return toast.error(`La suma (${bob(ef + qr)}) debe ser igual al total (${bob(total)})`)
      }
    }
    setConfirmando(true)
  }

  const guardarReal = async () => {
    setConfirmando(false)
    setGuardando(true)

    let efectivo = 0, qr = 0
    if (metodo === 'efectivo') efectivo = total
    else if (metodo === 'qr') qr = total
    else {
      efectivo = Number(montoEfectivo) || 0
      qr = Number(montoQR) || 0
    }

    // Guardar cliente si no existe
    if (cliente.trim()) {
      await supabase.from('clientes').insert({ nombre: cliente.trim() }).select()
      // Ignorar error si ya existe (por si acaso)
    }

    const { data: corte, error: errCorte } = await supabase
      .from('cortes')
      .insert({
        fecha, ayudante_id: ayudanteId,
        subtotal: total, total,
        metodo_pago: metodo,
        monto_efectivo: efectivo,
        monto_qr: qr,
        cliente: cliente.trim() || null,
        registrado_por: perfil?.id,
      })
      .select().single()

    if (errCorte) {
      toast.error('Error al guardar: ' + errCorte.message)
      setGuardando(false)
      return
    }

    const detalle = serviciosElegidos.map(s => ({
      corte_id: corte.id,
      servicio_id: s.id,
      nombre_servicio: s.nombre,
      precio: s.precio,
    }))
    const { error: errDet } = await supabase.from('corte_detalle').insert(detalle)
    setGuardando(false)

    if (errDet) return toast.error('Error en detalle')

    toast.success(`Corte guardado ✓ ${bob(total)}`)
    setSeleccionados({})
    setAyudanteId('')
    setCliente('')
    setMetodo('efectivo')
    setMontoEfectivo('')
    setMontoQR('')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold">Registrar corte</h1>
        <p className="text-texto-suave text-sm mt-1">Completa los datos del servicio</p>
      </div>

      <form onSubmit={prepararConfirmacion} className="bg-negro-suave border border-dorado/20 rounded-2xl p-5 md:p-6 space-y-6">
        {/* Fecha */}
        <div>
          <label className="text-sm text-texto-suave block mb-2 font-semibold">Fecha</label>
          <input type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={isCajero}
            className="w-full md:w-64 bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none transition disabled:opacity-60" />
        </div>

        {/* Barbero */}
        <div>
          <label className="text-sm text-texto-suave block mb-2 font-semibold">Barbero</label>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            {ayudantes.map(a => (
              <button type="button" key={a.id} onClick={() => setAyudanteId(a.id)}
                className={`px-4 py-3 rounded-xl border-2 transition font-semibold ${
                  ayudanteId === a.id
                    ? 'bg-dorado text-negro border-dorado shadow-lg shadow-dorado/20'
                    : 'border-dorado/20 text-texto-suave hover:border-dorado'
                }`}>
                {a.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente (opcional) */}
        <div>
          <label className="text-sm text-texto-suave block mb-2 font-semibold flex items-center gap-2">
            <User size={14} /> Nombre del cliente <span className="text-texto-muted text-xs">(opcional)</span>
          </label>
          <input
            type="text"
            value={cliente}
            onChange={e => setCliente(e.target.value)}
            placeholder="Ej: Juan Mamani"
            className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none transition" />
          <p className="text-[11px] text-texto-muted mt-1.5">
            💡 Si es un cliente nuevo, escribe su nombre completo. Si ya existe, agrega un apellido extra.
          </p>
        </div>

        {/* Servicios */}
        <div>
          <label className="text-sm text-texto-suave block mb-2 font-semibold">Servicios realizados</label>
          <div className="grid md:grid-cols-2 gap-2">
            {servicios.map(s => (
              <button type="button" key={s.id} onClick={() => toggleServicio(s.id)}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition text-left ${
                  seleccionados[s.id]
                    ? 'bg-dorado/10 border-dorado text-dorado'
                    : 'border-dorado/20 text-texto-suave hover:border-dorado/50'
                }`}>
                <span className="flex items-center gap-2 font-medium">
                  <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    seleccionados[s.id] ? 'bg-dorado border-dorado' : 'border-dorado/40'
                  }`}>
                    {seleccionados[s.id] && <Check size={14} className="text-negro" strokeWidth={3} />}
                  </span>
                  {s.nombre}
                </span>
                <span className="font-bold">{bobCorto(s.precio)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-negro border-2 border-dorado/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-texto-suave font-semibold">TOTAL</span>
          <span className="text-3xl md:text-4xl font-display text-dorado font-bold">{bob(total)}</span>
        </div>

        {/* Método */}
        <div>
          <label className="text-sm text-texto-suave block mb-2 font-semibold">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'efectivo', l: 'Efectivo', i: DollarSign },
              { v: 'qr', l: 'QR', i: QrCode },
              { v: 'mixto', l: 'Mixto', i: Split },
            ].map(({ v, l, i: Icon }) => (
              <button type="button" key={v} onClick={() => setMetodo(v)}
                className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition ${
                  metodo === v
                    ? 'bg-dorado text-negro border-dorado font-bold shadow-lg shadow-dorado/20'
                    : 'border-dorado/20 text-texto-suave hover:border-dorado'
                }`}>
                <Icon size={20} strokeWidth={2.3} /> <span className="text-sm">{l}</span>
              </button>
            ))}
          </div>

          {metodo === 'mixto' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-texto-suave font-semibold">Efectivo</label>
                <input type="number" value={montoEfectivo} inputMode="decimal"
                  onChange={e => setMontoEfectivo(e.target.value)}
                  className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-texto-suave font-semibold">QR</label>
                <input type="number" value={montoQR} inputMode="decimal"
                  onChange={e => setMontoQR(e.target.value)}
                  className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none mt-1" />
              </div>
            </div>
          )}
        </div>

        <button disabled={guardando}
          className="w-full bg-dorado text-negro font-bold py-4 rounded-xl hover:bg-dorado-claro transition disabled:opacity-50 text-lg shadow-lg shadow-dorado/20 active:scale-[0.98]">
          {guardando ? 'Guardando...' : `GUARDAR — ${bob(total)}`}
        </button>
      </form>

      <ConfirmDialog
        open={confirmando}
        titulo="¿Confirmar registro?"
        mensaje="Verifica los datos antes de guardar."
        detalle={
          <>
            <p><span className="text-texto-suave">Barbero:</span> <span className="text-dorado font-bold">{barberoNombre}</span></p>
            {cliente && <p><span className="text-texto-suave">Cliente:</span> {cliente}</p>}
            <p><span className="text-texto-suave">Fecha:</span> {fecha}</p>
            <p><span className="text-texto-suave">Servicios:</span></p>
            <ul className="ml-3 space-y-0.5">
              {serviciosElegidos.map(s => (
                <li key={s.id} className="text-texto-suave">• {s.nombre} — {bobCorto(s.precio)}</li>
              ))}
            </ul>
            <p className="pt-2 border-t border-dorado/20 mt-2">
              <span className="text-texto-suave">Total:</span>{' '}
              <span className="text-dorado font-bold text-lg">{bob(total)}</span>
            </p>
            <p><span className="text-texto-suave">Pago:</span> {metodo === 'efectivo' ? 'Efectivo' : metodo === 'qr' ? 'QR' : `Mixto (Ef: ${bob(montoEfectivo || 0)} + QR: ${bob(montoQR || 0)})`}</p>
          </>
        }
        confirmText="Sí, guardar"
        onConfirm={guardarReal}
        onCancel={() => setConfirmando(false)}
      />
    </div>
  )
}