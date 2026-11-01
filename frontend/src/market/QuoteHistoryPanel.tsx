import { useMemo } from 'react'
import type { HistorialCotizacion, EstrategiaCotizacion } from './market-api'

interface QuoteHistoryPanelProps {
  items: HistorialCotizacion[]
  estrategiaActiva: EstrategiaCotizacion | null
}

const width = 760
const height = 210
const inset = 24

export function QuoteHistoryPanel({ items, estrategiaActiva }: QuoteHistoryPanelProps) {
  const cotizaciones = useMemo(() => {
    const estrategia = estrategiaActiva ?? items[0]?.tipoEstrategia
    return items
      .filter((item) => !estrategia || item.tipoEstrategia === estrategia)
      .slice()
      .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
  }, [items, estrategiaActiva])
  const valores = cotizaciones.map((item) => item.cotizacion)
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 1
  const rango = max - min || 1
  const puntos = cotizaciones.map((item, index) => ({
    x: cotizaciones.length === 1 ? width / 2 : inset + (index / (cotizaciones.length - 1)) * (width - inset * 2),
    y: height - inset - ((item.cotizacion - min) / rango) * (height - inset * 2),
  }))
  const path = puntos.map((punto, index) => `${index === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ')

  return (
    <section className="quote-history-panel" aria-labelledby="quote-history-title">
      <div className="quote-history-heading">
        <div>
          <p className="section-kicker">Mercado</p>
          <h2 id="quote-history-title">Evolución de la cotización</h2>
        </div>
        <span>{estrategiaActiva === 'ataque_decisivo' ? 'Ataque decisivo' : estrategiaActiva === 'creacion_tecnica' ? 'Creación técnica' : 'Historial disponible'}</span>
      </div>
      {cotizaciones.length === 0 ? (
        <p className="quote-history-empty">Todavía no hay cotizaciones históricas para mostrar.</p>
      ) : (
        <>
          <div className="quote-chart-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Gráfico de ${cotizaciones.length} cotizaciones históricas`}>
              <line x1={inset} x2={width - inset} y1={height - inset} y2={height - inset} className="quote-chart-axis" />
              <line x1={inset} x2={width - inset} y1={inset} y2={inset} className="quote-chart-grid" />
              {path && <path d={path} className="quote-chart-line" />}
              {puntos.map((punto, index) => <circle key={`${punto.x}-${index}`} cx={punto.x} cy={punto.y} r="4" className="quote-chart-dot" />)}
            </svg>
            <div className="quote-chart-scale"><span>{min.toFixed(2)} cr</span><span>{max.toFixed(2)} cr</span></div>
          </div>
          <div className="quote-history-footnote">
            <span>{new Date(cotizaciones[0].fechaHora).toLocaleDateString('es-AR')}</span>
            <span>{new Date(cotizaciones[cotizaciones.length - 1].fechaHora).toLocaleDateString('es-AR')}</span>
          </div>
        </>
      )}
    </section>
  )
}
