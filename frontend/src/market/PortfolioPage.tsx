import { useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { TradeDialog } from './TradeDialog'
import { useMarket } from './market-context'
import type { PosicionPortfolio } from './market-api'
import { PortfolioCharts } from './PortfolioCharts'

function unidades(value: string): bigint {
  const negativo = value.startsWith('-')
  const limpio = negativo ? value.slice(1) : value
  const [enteros, decimales = '00'] = limpio.split('.')
  const importe = BigInt(enteros) * 100n + BigInt(decimales.padEnd(2, '0').slice(0, 2))
  return negativo ? -importe : importe
}

function credito(value: string | null): string {
  if (value === null) return 'Sin cotización'
  const importe = unidades(value)
  const signo = importe < 0n ? '-' : ''
  const absoluto = importe < 0n ? -importe : importe
  return `${signo}${(absoluto / 100n).toLocaleString('es-AR')},${(absoluto % 100n).toString().padStart(2, '0')} cr`
}

function signo(value: string | null): string {
  if (value === null) return '—'
  return `${unidades(value) > 0n ? '+' : ''}${credito(value)}`
}

export function PortfolioPage() {
  const { user } = useAuth()
  const { portfolio, portfolioStatus, portfolioError, refreshPortfolio } = useMarket()
  const [paraVender, setParaVender] = useState<PosicionPortfolio | null>(null)

  return (
    <main className="market-page">
      <header className="market-page-heading">
        <div>
          <p className="players-eyebrow">TU MERCADO</p>
          <h1>Mi <span>cartera</span></h1>
          <p className="players-intro">Tu saldo, el valor de tus posiciones y las operaciones recientes.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void refreshPortfolio()}>Actualizar</button>
      </header>

      {portfolioStatus === 'loading' && !portfolio && <div className="players-status" role="status">Cargando tu cartera…</div>}
      {portfolioStatus === 'error' && <div className="players-status players-status-error" role="alert"><p>{portfolioError}</p><button className="secondary-button" type="button" onClick={() => void refreshPortfolio()}>Reintentar</button></div>}
      {portfolio && (
        <>
          <section className="portfolio-summary" aria-label="Resumen de cartera">
            <article><span>Créditos disponibles</span><strong>{credito(portfolio.creditosDisponibles)}</strong></article>
            <article><span>Valor de posiciones</span><strong>{credito(portfolio.valorTotal)}</strong></article>
            <article className={!portfolio.gananciaPerdidaTotal.startsWith('-') ? 'portfolio-positive' : 'portfolio-negative'}>
              <span>Ganancia / pérdida estimada</span><strong>{signo(portfolio.gananciaPerdidaTotal)}</strong>
            </article>
          </section>

          <PortfolioCharts posiciones={portfolio.posiciones} valorTotal={portfolio.valorTotal} />

          <section className="portfolio-section">
            <div className="portfolio-section-heading">
              <div><p className="section-kicker">Posiciones</p><h2>Tus tokens</h2></div>
              <span>{portfolio.posiciones.length} jugadores</span>
            </div>
            {portfolio.posiciones.length === 0 ? (
              <div className="portfolio-empty"><h3>Tu cartera todavía está vacía</h3><p>Comprá tokens desde el mercado para empezar a seguir tus posiciones.</p></div>
            ) : (
              <div className="portfolio-table-wrap">
                <table className="portfolio-table">
                  <thead><tr><th>Jugador</th><th>Tokens</th><th>Precio promedio</th><th>Valor actual</th><th>Rendimiento</th><th /></tr></thead>
                  <tbody>
                    {portfolio.posiciones.map((posicion) => (
                      <tr key={posicion.idJugador}>
                        <td><strong>{posicion.jugador}</strong><small>{posicion.equipo} · {posicion.liga}</small></td>
                        <td>{posicion.cantidadTokens}</td>
                        <td>{credito(posicion.precioPromedioCompra)}</td>
                        <td>{credito(posicion.valorActual)}</td>
                        <td className={posicion.gananciaPerdida && !posicion.gananciaPerdida.startsWith('-') ? 'portfolio-positive' : 'portfolio-negative'}>{signo(posicion.gananciaPerdida)}</td>
                        <td>
                          {user?.rol !== 'superadmin' && posicion.cotizacion !== null && (
                            <button className="secondary-button portfolio-sell-button" type="button" onClick={() => setParaVender(posicion)}>Vender</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="portfolio-section">
            <div className="portfolio-section-heading">
              <div><p className="section-kicker">Actividad</p><h2>Historial de operaciones</h2></div>
            </div>
            {portfolio.operacionesRecientes.length === 0 ? (
              <div className="portfolio-empty"><p>Cuando compres o vendas tokens, vas a ver el historial acá.</p></div>
            ) : (
              <div className="operations-list">
                {portfolio.operacionesRecientes.map((operacion) => (
                  <article className="operation-row" key={operacion.idOperacion}>
                    <span className={`operation-type operation-type-${operacion.tipo}`}>{operacion.tipo === 'compra' ? 'Compra' : 'Venta'}</span>
                    <div><strong>{operacion.jugador}</strong><small>{operacion.cantidadTokens} tokens · {new Date(operacion.fechaHora).toLocaleString('es-AR')}</small></div>
                    <div className="operation-amount"><strong>{credito(operacion.importe)}</strong><small>{credito(operacion.cotizacion)} por token</small></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {paraVender && paraVender.cotizacion && (
        <TradeDialog
          jugadorId={paraVender.idJugador}
          nombreJugador={paraVender.jugador}
          cotizacion={paraVender.cotizacion}
          lado="venta"
          cantidadMaxima={paraVender.cantidadTokens}
          onClose={() => setParaVender(null)}
        />
      )}
    </main>
  )
}
