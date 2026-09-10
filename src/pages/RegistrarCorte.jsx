import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Check, DollarSign, QrCode, Split } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../hooks/useAuth'

export default function RegistrarCorte() {
  const { perfil, isCajero } = useAuth()
  const [ayudantes, setAyudantes] = useState([])
  const [servicios, setServicios] = useState([])
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [ayudanteId, setAyudanteId] = useState('')
  const [seleccionados, setSeleccionados] = useState({})
  const [metodo, setMetodo] = useState('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoQR, setMontoQR] = useState('')
  const [notas, setNotas] = useState('')
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

  const prepararConfirmacion = (e) => {
    e.preventDefault()
    if (!ayudanteId) return toast.error('Selecciona un barbero')
    if (serviciosElegidos.length === 0) return toast.error('Selecciona al menos un servicio')

    if (metodo === 'mixto') {
      const ef = Number(montoEfectivo) || 0
      const qr = Number(montoQR) || 0
      if (ef + qr !== total) {
        return toast.error(`La suma (Bs ${ef + qr}) debe ser igual al total (Bs ${total})`)
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

    const { data: corte, error: errCorte } = await supabase
      .from('cortes')
      .insert({
        fecha, ayudante_id: ayudanteId,
        subtotal: total, total,
        metodo_pago: metodo,
        monto_efectivo: efectivo,
        monto_qr: qr,
        notas,
        registrado_por: perfil?.id,
      })
      .select().single()

    if (errCorte) {
      toast.error('Error al guardar')
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

    toast.success(`Corte guardado ✓ Bs ${total}`)
    setSeleccionados({})
    setAyudanteId('')
    setMetodo('efectivo')
    setMontoEfectivo('')
    setMontoQR('')
    setNotas('')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl text-dorado mb-6">Registrar corte</h1>

      <form onSubmit={prepararConfirmacion} className="bg-negro-suave border border-dorado/20 rounded-2xl p-6 space-y-6">
        {/* Fecha */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Fecha</label>
          <input type="date" value={fecha}
            onChange={e => setFecha(e.target.value)}
            disabled={isCajero}
            className="w-full md:w-64 bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none disabled:opacity-60" />
          {isCajero && <p className="text-xs text-gray-500 mt-1">Los cajeros solo registran con fecha de hoy</p>}
        </div>

        {/* Barbero */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Barbero</label>
          <div className="flex flex-wrap gap-2">
            {ayudantes.map(a => (
              <button type="button" key={a.id} onClick={() => setAyudanteId(a.id)}
                className={`px-4 py-2 rounded-lg border transition ${
                  ayudanteId === a.id
                    ? 'bg-dorado text-negro border-dorado font-semibold'
                    : 'border-gray-700 text-gray-300 hover:border-dorado'
                }`}>
                {a.nombre}
              </button>
            ))}
            {ayudantes.length === 0 && (
              <p className="text-gray-500 text-sm">No hay barberos activos</p>
            )}
          </div>
        </div>

        {/* Servicios */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Servicios realizados</label>
          <div className="grid md:grid-cols-2 gap-2">
            {servicios.map(s => (
              <button type="button" key={s.id} onClick={() => toggleServicio(s.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                  seleccionados[s.id]
                    ? 'bg-dorado/10 border-dorado text-dorado'
                    : 'border-gray-700 text-gray-300 hover:border-dorado/50'
                }`}>
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded border flex items-center justify-center ${
                    seleccionados[s.id] ? 'bg-dorado border-dorado' : 'border-gray-600'
                  }`}>
                    {seleccionados[s.id] && <Check size={14} className="text-negro" />}
                  </span>
                  {s.nombre}
                </span>
                <span className="font-semibold">Bs {s.precio}</span>
              </button>
            ))}
            {servicios.length === 0 && (
              <p className="text-gray-500 text-sm">No hay servicios activos</p>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="bg-negro border border-dorado/30 rounded-lg p-4 flex items-center justify-between">
          <span className="text-gray-400">TOTAL</span>
          <span className="text-3xl font-display text-dorado">Bs {total}</span>
        </div>

        {/* Método de pago */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'efectivo', l: 'Efectivo', i: DollarSign },
              { v: 'qr', l: 'QR', i: QrCode },
              { v: 'mixto', l: 'Mixto', i: Split },
            ].map(({ v, l, i: Icon }) => (
              <button type="button" key={v} onClick={() => setMetodo(v)}
                className={`flex flex-col items-center gap-1 py-3 rounded-lg border transition ${
                  metodo === v
                    ? 'bg-dorado text-negro border-dorado font-semibold'
                    : 'border-gray-700 text-gray-300 hover:border-dorado'
                }`}>
                <Icon size={20} /> {l}
              </button>
            ))}
          </div>

          {metodo === 'mixto' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-400">Efectivo (Bs)</label>
                <input type="number" value={montoEfectivo}
                  onChange={e => setMontoEfectivo(e.target.value)}
                  className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400">QR (Bs)</label>
                <input type="number" value={montoQR}
                  onChange={e => setMontoQR(e.target.value)}
                  className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2 outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Notas (opcional)</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows="2"
            className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2 outline-none resize-none" />
        </div>

        <button disabled={guardando}
          className="w-full bg-dorado text-negro font-bold py-3 rounded-lg hover:bg-dorado-claro transition disabled:opacity-50 text-lg">
          {guardando ? 'Guardando...' : `GUARDAR CORTE — Bs ${total}`}
        </button>
      </form>

      {/* Modal de confirmación */}
      <ConfirmDialog
        open={confirmando}
        titulo="¿Confirmar registro?"
        mensaje="Verifica los datos antes de guardar el corte."
        detalle={
          <>
            <p><span className="text-gray-400">Barbero:</span> <span className="text-dorado font-semibold">{barberoNombre}</span></p>
            <p><span className="text-gray-400">Fecha:</span> {fecha}</p>
            <p><span className="text-gray-400">Servicios:</span></p>
            <ul className="ml-3 space-y-0.5">
              {serviciosElegidos.map(s => (
                <li key={s.id} className="text-gray-300">• {s.nombre} — Bs {s.precio}</li>
              ))}
            </ul>
            <p className="pt-2 border-t border-dorado/20"><span className="text-gray-400">Total:</span> <span className="text-dorado font-bold text-lg">Bs {total}</span></p>
            <p><span className="text-gray-400">Pago:</span> {metodo === 'efectivo' ? 'Efectivo' : metodo === 'qr' ? 'QR' : `Mixto (Ef: Bs ${montoEfectivo || 0} + QR: Bs ${montoQR || 0})`}</p>
            {notas && <p><span className="text-gray-400">Notas:</span> {notas}</p>}
          </>
        }
        confirmText="Sí, guardar"
        onConfirm={guardarReal}
        onCancel={() => setConfirmando(false)}
      />
    </div>
  )
}