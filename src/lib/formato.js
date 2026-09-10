/**
 * Formatea un número como moneda BOB.
 * Ej: 2500 → "BOB 2.500,00"
 */
export function bob(valor) {
  const num = Number(valor) || 0
  return `BOB ${num.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Formato compacto sin decimales para tarjetas.
 * Ej: 2500 → "BOB 2.500"
 */
export function bobCorto(valor) {
  const num = Number(valor) || 0
  return `BOB ${num.toLocaleString('es-BO', { maximumFractionDigits: 0 })}`
}

/**
 * Formatea una fecha en español.
 */
export function fecha(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}