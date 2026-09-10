import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Save, Upload, Store } from 'lucide-react'

export default function Configuracion() {
  const [config, setConfig] = useState({
    nombre_negocio: '', logo_url: '', color_primario: '#D4AF37', moneda: 'Bs'
  })
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('configuracion').select('*').eq('id', 1).single()
      if (data) setConfig(data)
      setCargando(false)
    }
    cargar()
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('configuracion').update({
      nombre_negocio: config.nombre_negocio,
      color_primario: config.color_primario,
      moneda: config.moneda,
    }).eq('id', 1)
    if (error) return toast.error('Error al guardar')
    toast.success('Configuración guardada ✓')
  }

  const subirLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `logo-${Date.now()}.${ext}`

    const { error: errUp } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (errUp) { toast.error('Error al subir logo'); setSubiendo(false); return }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('configuracion').update({ logo_url: publicUrl }).eq('id', 1)
    setConfig({ ...config, logo_url: publicUrl })
    setSubiendo(false)
    toast.success('Logo actualizado ✓')
  }

  if (cargando) return <p className="text-gray-400">Cargando...</p>

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-dorado">Configuración</h1>
        <p className="text-gray-400 text-sm">Personaliza tu negocio</p>
      </div>

      <form onSubmit={guardar} className="bg-negro-suave border border-dorado/20 rounded-2xl p-6 space-y-6">
        {/* Logo */}
        <div>
          <label className="text-sm text-gray-400 block mb-3">Logo del negocio</label>
          <div className="flex items-center gap-4">
            <img src={config.logo_url || '/logo.png'} alt="Logo"
              className="w-20 h-20 rounded-full object-cover border-2 border-dorado" />
            <label className="cursor-pointer bg-negro border border-dorado text-dorado px-4 py-2.5 rounded-lg hover:bg-dorado/10 transition flex items-center gap-2">
              <Upload size={18} /> {subiendo ? 'Subiendo...' : 'Cambiar logo'}
              <input type="file" accept="image/*" onChange={subirLogo} className="hidden" disabled={subiendo} />
            </label>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="text-sm text-gray-400 block mb-1 flex items-center gap-2">
            <Store size={14} /> Nombre del negocio
          </label>
          <input value={config.nombre_negocio}
            onChange={e => setConfig({ ...config, nombre_negocio: e.target.value })}
            className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
        </div>

        {/* Moneda */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Moneda</label>
          <input value={config.moneda}
            onChange={e => setConfig({ ...config, moneda: e.target.value })}
            className="w-full md:w-32 bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none" />
        </div>

        {/* Color */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Color principal</label>
          <div className="flex items-center gap-3">
            <input type="color" value={config.color_primario}
              onChange={e => setConfig({ ...config, color_primario: e.target.value })}
              className="w-16 h-12 rounded cursor-pointer bg-transparent" />
            <span className="text-gray-400">{config.color_primario}</span>
          </div>
        </div>

        <button className="w-full bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition flex items-center justify-center gap-2">
          <Save size={18} /> Guardar cambios
        </button>
      </form>
    </div>
  )
}