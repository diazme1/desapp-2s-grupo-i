import { useMemo, useState } from 'react'
import type { HistorialCotizacion, EstrategiaCotizacion } from './market-api'

interface QuoteHistoryPanelProps {
  items: HistorialCotizacion[]
  estrategiaActiva: EstrategiaCotizacion | null
}

interface CotizacionDiaria {
  fechaKey: string
  cotizacion: number
  variacion: number | null
  variacionPorcentual: number | null
}

const width = 760
const height = 230
const inset = 28
const estrategias: { value: EstrategiaCotizacion; label: string }[] = [
  { value: 'ataque_decisivo', label: 'Ataque decisivo' },
  { value: 'creacion_tecnica', label: 'Creación técnica' },
]

const formatoCotizacion = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function fechaLocalKey(fechaHora: string): string {
  const fecha = new Date(fechaHora)
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function fechaCorta(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })
}

function cambioTexto(variacion: number): string {
  const signo = variacion > 0 ? '+' : variacion < 0 ? '−' : ''
  return `${signo}${formatoCotizacion.format(Math.abs(variacion))} cr`
}

function cambioPorcentualTexto(variacion: number | null): string {
  if (variacion === null) return ''
  const signo = variacion > 0 ? '+' : variacion < 0 ? '−' : ''
  return `${signo}${formatoCotizacion.format(Math.abs(variacion))}%`
}

export function QuoteHistoryPanel({ items, estrategiaActiva }: QuoteHistoryPanelProps) {
  const [estrategiaElegida, setEstrategiaElegida] = useState<EstrategiaCotizacion | null>(null)
  const estrategia = estrategiaElegida ?? estrategiaActiva ?? 'ataque_decisivo'

  const cotizacionesDiarias = useMemo(() => {
    const cotizaciones = items
      .filter((item) => item.tipoEstrategia === estrategia)
      .slice()
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())

    // Si hubo más de un recálculo en el mismo día, el valor diario es el último de ese día.
    const cierrePorDia = new Map<string, HistorialCotizacion>()
    for (const item of cotizaciones) cierrePorDia.set(fechaLocalKey(item.fechaHora), item)

    return Array.from(cierrePorDia.entries()).map(([fechaKey, item], index, dias): CotizacionDiaria => {
      const anterior = index > 0 ? dias[index - 1][1].cotizacion : null
      const variacion = anterior === null ? null : item.cotizacion - anterior
      return {
        fechaKey,
        cotizacion: item.cotizacion,
        variacion,
        variacionPorcentual: anterior === null || anterior === 0 || variacion === null
          ? null
          : (variacion / anterior) * 100,
      }
    })
  }, [items, estrategia])

  const valores = cotizacionesDiarias.map((item) => item.cotizacion)
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 0
  const variacionRango = max - min
  // Un margen alrededor del valor evita que una serie sin cambios quede pegada al borde.
  const margen = variacionRango === 0 ? Math.max(max * 0.06, 0.5) : variacionRango * 0.18
  const escalaMin = min - margen
  const escalaMax = max + margen
  const escalaRango = escalaMax - escalaMin || 1
  const puntos = cotizacionesDiarias.map((item, index) => ({
    ...item,
    x: cotizacionesDiarias.length === 1
      ? width / 2
      : inset + (index / (cotizacionesDiarias.length - 1)) * (width - inset * 2),
    y: height - inset - ((item.cotizacion - escalaMin) / escalaRango) * (height - inset * 2),
  }))
  const path = puntos.map((punto, index) => `${index === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ')
  const ultimaVariacion = cotizacionesDiarias[cotizacionesDiarias.length - 1]
  const variacionesRecientes = cotizacionesDiarias
    .filter((item) => item.variacion !== null)
    .slice(-6)

  return (
    <section className="quote-history-panel" aria-labelledby="quote-history-title">
      <div className="quote-history-heading">
        <div>
          <p className="section-kicker">Mercado</p>
          <h2 id="quote-history-title">Evolución de la cotización</h2>
          <p className="quote-history-description">Cada punto muestra el último precio registrado en esa fecha y su cambio frente al registro anterior.</p>
        </div>
        {ultimaVariacion?.variacion !== null && ultimaVariacion?.variacion !== undefined ? (
          <span className={`quote-latest-change ${ultimaVariacion.variacion > 0 ? 'is-up' : ultimaVariacion.variacion < 0 ? 'is-down' : 'is-flat'}`}>
            {ultimaVariacion.variacion > 0 ? '↑ Subió' : ultimaVariacion.variacion < 0 ? '↓ Bajó' : '→ Sin cambios'} {cambioTexto(ultimaVariacion.variacion)}
          </span>
        ) : <span className="quote-latest-change is-flat">Sin variación diaria aún</span>}
      </div>

      <div className="quote-strategy-picker" role="group" aria-label="Estrategia de cotización para el gráfico">
        {estrategias.map((opcion) => (
          <button
            key={opcion.value}
            className={estrategia === opcion.value ? 'is-selected' : ''}
            type="button"
            aria-pressed={estrategia === opcion.value}
            onClick={() => setEstrategiaElegida(opcion.value)}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      {cotizacionesDiarias.length === 0 ? (
        <p className="quote-history-empty">Todavía no hay cotizaciones históricas para esta estrategia.</p>
      ) : (
        <>
          <div className="quote-chart-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución diaria de ${cotizacionesDiarias.length} cotizaciones para ${estrategias.find((opcion) => opcion.value === estrategia)?.label}`}>
              <line x1={inset} x2={width - inset} y1={height - inset} y2={height - inset} className="quote-chart-axis" />
              <line x1={inset} x2={width - inset} y1={inset} y2={inset} className="quote-chart-grid" />
              {path && <path d={path} className="quote-chart-line" />}
              {puntos.map((punto) => {
                const claseCambio = punto.variacion === null ? 'is-first' : punto.variacion > 0 ? 'is-up' : punto.variacion < 0 ? 'is-down' : 'is-flat'
                const detalleCambio = punto.variacion === null
                  ? 'Primer día del historial'
                  : punto.variacion > 0
                    ? `Subió ${cambioTexto(punto.variacion)}${punto.variacionPorcentual === null ? '' : ` (${cambioPorcentualTexto(punto.variacionPorcentual)})`}`
                    : punto.variacion < 0
                      ? `Bajó ${cambioTexto(punto.variacion)}${punto.variacionPorcentual === null ? '' : ` (${cambioPorcentualTexto(punto.variacionPorcentual)})`}`
                      : 'Sin cambios respecto del día anterior'
                return (
                  <circle key={punto.fechaKey} cx={punto.x} cy={punto.y} r="5" className={`quote-chart-dot ${claseCambio}`}>
                    <title>{`${new Date(`${punto.fechaKey}T12:00:00`).toLocaleDateString('es-AR')}: ${formatoCotizacion.format(punto.cotizacion)} cr. ${detalleCambio}`}</title>
                  </circle>
                )
              })}
            </svg>
            <div className="quote-chart-scale"><span>{formatoCotizacion.format(min)} cr</span><span>{formatoCotizacion.format(max)} cr</span></div>
          </div>
          <div className="quote-chart-legend" aria-label="Referencias de variación">
            <span><i className="is-up" aria-hidden="true" />Subió</span>
            <span><i className="is-down" aria-hidden="true" />Bajó</span>
            <span><i className="is-flat" aria-hidden="true" />Sin cambios</span>
          </div>
          <div className="quote-history-footnote">
            <span>{new Date(`${cotizacionesDiarias[0].fechaKey}T12:00:00`).toLocaleDateString('es-AR')}</span>
            <span>{new Date(`${cotizacionesDiarias[cotizacionesDiarias.length - 1].fechaKey}T12:00:00`).toLocaleDateString('es-AR')}</span>
          </div>
          {variacionesRecientes.length > 0 && (
            <div className="quote-daily-changes" aria-label="Variaciones diarias recientes">
              <strong>Variación por día</strong>
              <div className="quote-daily-changes-list">
                {variacionesRecientes.map((item) => {
                  const claseCambio = item.variacion! > 0 ? 'is-up' : item.variacion! < 0 ? 'is-down' : 'is-flat'
                  const icono = item.variacion! > 0 ? '↑' : item.variacion! < 0 ? '↓' : '→'
                  return (
                    <div className={`quote-daily-change ${claseCambio}`} key={item.fechaKey}>
                      <span>{fechaCorta(item.fechaKey)}</span>
                      <strong>{formatoCotizacion.format(item.cotizacion)} cr</strong>
                      <small>{icono} {cambioTexto(item.variacion!)}{item.variacionPorcentual === null ? '' : ` · ${cambioPorcentualTexto(item.variacionPorcentual)}`}</small>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
