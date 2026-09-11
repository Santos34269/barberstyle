import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Minus, Plus, DollarSign, QrCode, Split, ShoppingBag, AlertTriangle } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../hooks/useAuth'
import { bob, bobCorto } from '../lib/formato'
import { hoyBolivia } from '../lib/fecha'

export default function VenderProducto() {
  const { perfil } = useAuth()
  const [productos, setProductos] = useState([])
  const [categoria, setCategoria] = useState('cuidado')
  const [fecha, setFecha] = useState(hoyBolivia())
  const [carrito, setCarrito] = useState({}) // { productoId: cantidad }
  const [metodo, setMetodo] = useState('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [montoQR, setMontoQR] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const cargar = async () => {
    const { data } = await supabase
      .from('productos').select('*').eq('activo', true)
      .order('nombre')
    setProductos(data || [])
  }
  useEffect(() => { cargar() }, [])

  const productosFiltrados = productos.filter(p => p.categoria === categoria)

  const cambiarCantidad = (id, delta, stockMax) => {
    setCarrito(prev => {
      const actual = prev[id] || 0
      const nuevo = actual + delta
      if (nuevo < 0) return prev
      if (nuevo > stockMax) {
        toast.error(`Solo hay ${stockMax} en stock`)
        return prev
      }
      if (nuevo === 0) {
        const copia = { ...prev }
        delete copia[id]
        return copia
      }
      return { ...prev, [id]: nuevo }
    })
  }

  const itemsCarrito = productos
    .filter(p => carrito[p.id])
    .map(p => ({ ...p, cantidad: carrito[p.id] }))

  const total = itemsCarrito.reduce((s, p) => s + Number(p.precio) * p.cantidad, 0)
  const totalItems = itemsCarrito.reduce((s, p) => s + p.cantidad, 0)

  const prepararConfirmacion = (e) => {
    e.preventDefault()
    if (itemsCarrito.length === 0) return toast.error('Agrega al menos un producto')

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

    // 1. Insertar cada venta
    const ventas = itemsCarrito.map(p => ({
      fecha,
      producto_id: p.id,
      nombre_producto: p.nombre,
      cantidad: p.cantidad,
      precio_unitario: p.precio,
      total: p.precio * p.cantidad,
      metodo_pago: metodo,
      monto_efectivo: efectivo,
      monto_qr: qr,
      registrado_por: perfil?.id,
    }))

    const { error: errVenta } = await supabase.from('ventas_productos').insert(ventas)
    if (errVenta) {
      toast.error('Error: ' + errVenta.message)
      setGuardando(false)
      return
    }

    // 2. Descontar stock de cada producto
    for (const p of itemsCarrito) {
      const nuevoStock = p.stock - p.cantidad
      await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id)
    }

    setGuardando(false)
    toast.success(`Venta guardada ✓ ${bob(total)}`)
    setCarrito({})
    setMetodo('efectivo')
    setMontoEfectivo('')
    setMontoQR('')
    await cargar()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl text-dorado font-bold flex items-center gap-3">
          <ShoppingBag /> Vender producto
        </h1>
        <p className="text-texto-suave text-sm mt-1">Productos de cuidado y bebidas</p>
      </div>

      <form onSubmit={prepararConfirmacion} className="space-y-5">

        {/* Fecha + Categoría */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
            <label className="text-sm text-texto-suave block mb-2 font-semibold">Fecha</label>
            <input type="date" value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none" />
          </div>

          <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
            <label className="text-sm text-texto-suave block mb-2 font-semibold">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'cuidado', l: '🧴 Cuidado' },
                { v: 'bebida', l: '🥤 Bebidas' },
              ].map(c => (
                <button type="button" key={c.v} onClick={() => setCategoria(c.v)}
                  className={`py-3 rounded-xl border-2 font-semibold transition text-sm ${
                    categoria === c.v
                      ? 'bg-dorado text-negro border-dorado'
                      : 'border-dorado/20 text-texto-suave hover:border-dorado'
                  }`}>
                  {c.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
          <h3 className="text-sm text-texto-suave font-semibold mb-3">Productos disponibles</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {productosFiltrados.map(p => {
              const cant = carrito[p.id] || 0
              const stockBajo = p.stock <= p.stock_minimo
              const sinStock = p.stock === 0
              return (
                <div key={p.id}
                  className={`bg-negro border-2 rounded-xl p-3 transition ${
                    cant > 0 ? 'border-dorado' : 'border-dorado/15'
                  } ${sinStock ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm flex-1 truncate">{p.nombre}</p>
                    {stockBajo && !sinStock && <AlertTriangle className="text-alerta shrink-0" size={14} />}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-dorado font-bold">{bobCorto(p.precio)}</span>
                    <span className={`text-xs font-semibold ${sinStock ? 'text-error' : stockBajo ? 'text-alerta' : 'text-exito'}`}>
                      Stock: {p.stock}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button type="button" disabled={sinStock || cant === 0}
                      onClick={() => cambiarCantidad(p.id, -1, p.stock)}
                      className="w-9 h-9 rounded-lg bg-negro-hover border border-dorado/20 text-dorado flex items-center justify-center disabled:opacity-30">
                      <Minus size={16} />
                    </button>
                    <span className="font-display text-xl text-dorado font-bold min-w-[2ch] text-center">
                      {cant}
                    </span>
                    <button type="button" disabled={sinStock || cant >= p.stock}
                      onClick={() => cambiarCantidad(p.id, 1, p.stock)}
                      className="w-9 h-9 rounded-lg bg-dorado text-negro flex items-center justify-center disabled:opacity-30">
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )
            })}
            {productosFiltrados.length === 0 && (
              <p className="text-texto-muted text-sm col-span-full text-center py-6">
                No hay productos en esta categoría
              </p>
            )}
          </div>
        </div>

        {/* Total */}
        {totalItems > 0 && (
          <div className="bg-negro border-2 border-dorado/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-texto-suave text-sm font-semibold">{totalItems} producto{totalItems > 1 ? 's' : ''}</p>
              <p className="text-texto-muted text-xs">en el carrito</p>
            </div>
            <span className="text-3xl md:text-4xl font-display text-dorado font-bold">{bob(total)}</span>
          </div>
        )}

        {/* Método */}
        {totalItems > 0 && (
          <div className="bg-negro-suave border border-dorado/20 rounded-2xl p-4">
            <label className="text-sm text-texto-suave block mb-3 font-semibold">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'efectivo', l: 'Efectivo', i: DollarSign },
                { v: 'qr', l: 'QR', i: QrCode },
                { v: 'mixto', l: 'Mixto', i: Split },
              ].map(({ v, l, i: Icon }) => (
                <button type="button" key={v} onClick={() => setMetodo(v)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition ${
                    metodo === v
                      ? 'bg-dorado text-negro border-dorado font-bold'
                      : 'border-dorado/20 text-texto-suave hover:border-dorado'
                  }`}>
                  <Icon size={20} /> <span className="text-sm">{l}</span>
                </button>
              ))}
            </div>

            {metodo === 'mixto' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs text-texto-suave font-semibold">Efectivo</label>
                  <input type="number" inputMode="decimal" value={montoEfectivo}
                    onChange={e => setMontoEfectivo(e.target.value)}
                    className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs text-texto-suave font-semibold">QR</label>
                  <input type="number" inputMode="decimal" value={montoQR}
                    onChange={e => setMontoQR(e.target.value)}
                    className="w-full bg-negro border border-dorado/20 focus:border-dorado rounded-xl px-3 py-3 outline-none mt-1" />
                </div>
              </div>
            )}
          </div>
        )}

        <button disabled={guardando || totalItems === 0}
          className="w-full bg-dorado text-negro font-bold py-4 rounded-xl hover:bg-dorado-claro transition disabled:opacity-50 text-lg shadow-lg shadow-dorado/20 active:scale-[0.98]">
          {guardando ? 'Guardando...' : totalItems === 0 ? 'Agrega productos' : `GUARDAR VENTA — ${bob(total)}`}
        </button>
      </form>

      <ConfirmDialog
        open={confirmando}
        titulo="¿Confirmar venta?"
        mensaje="Verifica los productos antes de guardar."
        detalle={
          <>
            <p><span className="text-texto-suave">Fecha:</span> {fecha}</p>
            <p className="text-texto-suave mb-1">Productos:</p>
            <ul className="ml-3 space-y-0.5">
              {itemsCarrito.map(p => (
                <li key={p.id} className="text-texto-suave">
                  • {p.nombre} <span className="text-dorado">×{p.cantidad}</span> — {bobCorto(p.precio * p.cantidad)}
                </li>
              ))}
            </ul>
            <p className="pt-2 border-t border-dorado/20 mt-2">
              <span className="text-texto-suave">Total:</span>{' '}
              <span className="text-dorado font-bold text-lg">{bob(total)}</span>
            </p>
            <p><span className="text-texto-suave">Pago:</span> {metodo}</p>
          </>
        }
        confirmText="Sí, vender"
        onConfirm={guardarReal}
        onCancel={() => setConfirmando(false)}
      />
    </div>
  )
}