import type { CSSProperties } from 'react'
import type { PosicionPortfolio } from './market-api'

const COLORES = ['#138d58', '#236e9b', '#e7a83b', '#7959b5', '#df765c', '#5b9a8d']
const CIRCUNFERENCIA = 2 * Math.PI * 42

function unidades(value: string | null): bigint {
  if (!value) return 0n
  const negativo = value.startsWith('-')
  const limpio = negativo ? value.slice(1) : value
  const [enteros, fraccion = '00'] = limpio.split('.')
  const importe = BigInt(enteros) * 100n + BigInt(fraccion.padEnd(2, '0').slice(0, 2))
  return negativo ? -importe : importe
}

function importe(unidadesImporte: bigint): string {
  const signo = unidadesImporte < 0n ? '-' : ''
  const absoluto = unidadesImporte < 0n ? -unidadesImporte : unidadesImporte
  const enteros = absoluto / 100n
  const centavos = (absoluto % 100n).toString().padStart(2, '0')
  return `${signo}${enteros.toLocaleString('es-AR')},${centavos} cr`
}

function porcentaje(parte: bigint, total: bigint): string {
  if (total <= 0n) return '0,0'
  const decimas = Number((parte * 1000n) / total)
  return `${(decimas / 10).toFixed(1).replace('.', ',')}`
}

interface PortfolioChartsProps {
  posiciones: PosicionPortfolio[]
  valorTotal: string
}

export function PortfolioCharts({ posiciones, valorTotal }: PortfolioChartsProps) {
  const valorizadas = posiciones
    .map((posicion) => ({ posicion, monto: unidades(posicion.valorActual) }))
    .filter((item) => item.monto > 0n)
    .sort((a, b) => (a.monto > b.monto ? -1 : a.monto < b.monto ? 1 : 0))
  const valorGrafico = valorizadas.reduce((total, item) => total + item.monto, 0n)
  const principales = valorizadas.slice(0, 5).map((item, indice) => ({
    id: item.posicion.idJugador,
    etiqueta: item.posicion.jugador,
    monto: item.monto,
    color: COLORES[indice % COLORES.length],
  }))
  const restantes = valorizadas.slice(5)
  if (restantes.length > 0) {
    principales.push({
      id: 'otros',
      etiqueta: 'Otros jugadores',
      monto: restantes.reduce((total, item) => total + item.monto, 0n),
      color: '#a7b3c0',
    })
  }

  let recorrido = 0
  const segmentos = principales.map((item, indice) => {
    const longitud = indice === principales.length - 1
      ? CIRCUNFERENCIA - recorrido
      : CIRCUNFERENCIA * Number((item.monto * 10000n) / valorGrafico) / 10000
    const segmento = { ...item, longitud, desplazamiento: -recorrido }
    recorrido += longitud
    return segmento
  })

  const rendimientos = posiciones
    .filter((posicion) => posicion.gananciaPerdida !== null)
    .map((posicion) => ({ posicion, resultado: unidades(posicion.gananciaPerdida) }))
    .sort((a, b) => {
      const valorA = a.resultado < 0n ? -a.resultado : a.resultado
      const valorB = b.resultado < 0n ? -b.resultado : b.resultado
      return valorA > valorB ? -1 : valorA < valorB ? 1 : 0
    })
    .slice(0, 6)
  const maximo = rendimientos.reduce((mayor, item) => {
    const valor = item.resultado < 0n ? -item.resultado : item.resultado
    return valor > mayor ? valor : mayor
  }, 0n)

  return (
    <section className="portfolio-charts" aria-label="Gráficos de tu cartera">
      <article className="portfolio-chart-card">
        <p className="section-kicker">Composición</p>
        <h2>Distribución por valor actual</h2>
        {segmentos.length === 0 ? (
          <p className="portfolio-chart-empty">Todavía no hay posiciones para graficar.</p>
        ) : (
          <div className="portfolio-allocation">
            <div className="portfolio-donut-wrap">
              <svg className="portfolio-donut" viewBox="0 0 120 120" role="img" aria-label="Distribución del valor de las posiciones por jugador">
                <circle cx="60" cy="60" r="42" fill="none" stroke="#edf1f3" strokeWidth="16" />
                {segmentos.map((segmento) => (
                  <circle
                    key={segmento.id}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke={segmento.color}
                    strokeWidth="16"
                    strokeDasharray={`${segmento.longitud} ${CIRCUNFERENCIA - segmento.longitud}`}
                    strokeDashoffset={segmento.desplazamiento}
                    transform="rotate(-90 60 60)"
                  />
                ))}
              </svg>
              <div className="portfolio-donut-center">
                <span>Valor actual</span>
                <strong>{importe(unidades(valorTotal))}</strong>
              </div>
            </div>
            <ul className="portfolio-chart-legend">
              {segmentos.map((segmento) => (
                <li key={segmento.id}>
                  <span className="portfolio-legend-dot" style={{ '--legend-color': segmento.color } as CSSProperties} />
                  <span className="portfolio-legend-name" title={segmento.etiqueta}>{segmento.etiqueta}</span>
                  <strong>{porcentaje(segmento.monto, valorGrafico)}%</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <article className="portfolio-chart-card">
        <p className="section-kicker">Rendimiento</p>
        <h2>Ganancia / pérdida por jugador</h2>
        {rendimientos.length === 0 ? (
          <p className="portfolio-chart-empty">Las variaciones van a aparecer cuando tengas posiciones.</p>
        ) : (
          <div className="portfolio-performance-list">
            {rendimientos.map(({ posicion, resultado }) => {
              const absoluto = resultado < 0n ? -resultado : resultado
              const ancho = maximo > 0n ? Number((absoluto * 5000n) / maximo) / 100 : 0
              const estilo = {
                left: resultado < 0n ? `${50 - ancho}%` : '50%',
                width: `${ancho}%`,
              } as CSSProperties
              return (
                <div className="portfolio-performance-row" key={posicion.idJugador}>
                  <span className="portfolio-performance-name" title={posicion.jugador}>{posicion.jugador}</span>
                  <div className="portfolio-performance-track" aria-hidden="true">
                    <span className={`portfolio-performance-bar ${resultado < 0n ? 'is-negative' : 'is-positive'}`} style={estilo} />
                  </div>
                  <strong className={resultado < 0n ? 'portfolio-negative' : 'portfolio-positive'}>{importe(resultado)}</strong>
                </div>
              )
            })}
          </div>
        )}
        <p className="portfolio-chart-footnote">Se muestran hasta seis posiciones con mayor variación.</p>
      </article>
    </section>
  )
}
