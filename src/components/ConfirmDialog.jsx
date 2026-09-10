import { X, AlertCircle } from 'lucide-react'

export default function ConfirmDialog({ open, titulo, mensaje, detalle, onConfirm, onCancel, confirmText = 'Confirmar' }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-negro-suave border border-dorado/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="text-dorado shrink-0" size={28} />
          <div className="flex-1">
            <h2 className="font-display text-xl text-dorado">{titulo}</h2>
            <p className="text-gray-300 text-sm mt-1">{mensaje}</p>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {detalle && (
          <div className="bg-negro border border-dorado/20 rounded-lg p-4 mb-5 space-y-1.5 text-sm">
            {detalle}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-lg hover:bg-white/5 transition">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-dorado text-negro font-semibold py-2.5 rounded-lg hover:bg-dorado-claro transition">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}