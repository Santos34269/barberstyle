import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const DOMINIO = '@newstyle.local'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const email = usuario.trim().toLowerCase().includes('@')
      ? usuario.trim().toLowerCase()
      : usuario.trim().toLowerCase() + DOMINIO

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return toast.error('Usuario o contraseña incorrectos')
    toast.success('Bienvenido ✓')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-negro p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="New Style" className="w-24 h-24 mx-auto rounded-full border-2 border-dorado mb-4 object-cover" />
          <h1 className="font-display text-3xl text-dorado">New Style</h1>
          <p className="text-gray-400 text-sm">Barber Shop</p>
        </div>

        <form onSubmit={handleLogin} className="bg-negro-suave border border-dorado/30 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Usuario</label>
            <input value={usuario} onChange={e => setUsuario(e.target.value)}
              autoComplete="username"
              className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none"
              required />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-negro border border-gray-700 focus:border-dorado rounded-lg px-3 py-2.5 outline-none"
              required />
          </div>
          <button disabled={loading}
            className="w-full bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">© 2026 New Style Barber Shop</p>
      </div>
    </div>
  )
}