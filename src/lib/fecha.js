const TZ = 'America/La_Paz'

/**
 * Fecha en formato YYYY-MM-DD en zona Bolivia.
 */
export function hoyBolivia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
}

/**
 * Fecha + hora completa en español Bolivia.
 */
export function ahoraBolivia() {
  return new Date().toLocaleString('es-BO', { timeZone: TZ })
}

/**
 * Solo la hora HH:MM:SS en Bolivia.
 */
export function horaBolivia() {
  return new Date().toLocaleTimeString('es-BO', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

/**
 * Formatea fecha tipo "11 sep 2026" en Bolivia.
 */
export function fechaBolivia(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00-04:00')
  return d.toLocaleDateString('es-BO', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric'
  })
}

/**
 * Formatea timestamp a "11 sep 2026, 14:30".
 */
export function timestampBolivia(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-BO', {
    timeZone: TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}