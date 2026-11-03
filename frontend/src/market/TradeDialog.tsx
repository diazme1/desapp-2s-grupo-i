import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { obtenerPrediccion } from '../players/players-api'
import type { PrediccionJugador } from '../players/player-types'
import { comprarTokens, venderTokens, type ResultadoOperacion } from './market-api'
import { useMarket } from './market-context'

interface TradeDialogProps {
  jugadorId: string
  nombreJugador: string
  cotizacion: string
  lado: 'compra' | 'venta'
  cantidadMaxima?: number
  onClose: () => void
}

function centavos(decimal: string): bigint {
  const [enteros, fraccion = '00'] = decimal.split('.')
  return BigInt(enteros) * 100n + BigInt(fraccion.padEnd(2, '0').slice(0, 2))
}

function formatoCreditos(unidades: bigint): string {
  const enteros = unidades / 100n
  const decimales = (unidades % 100n).toString().padStart(2, '0')
  return `${enteros.toLocaleString('es-AR')},${decimales}`
}

export function TradeDialog({
  jugadorId,
  nombreJugador,
  cotizacion,
  lado,
  cantidadMaxima = 100,
  onClose,
}: TradeDialogProps) {
  const { session } = useAuth()
  const { refreshPortfolio } = useMarket()
  const [cantidad, setCantidad] = useState('1')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoOperacion | null>(null)
  const [prediccion, setPrediccion] = useState<PrediccionJugador | null>(null)
  const [consultandoPrediccion, setConsultandoPrediccion] = useState(false)
  const [errorPrediccion, setErrorPrediccion] = useState('')
  const compra = lado === 'compra'
  const cantidadNumerica = Number(cantidad)
  const cantidadValida = Number.isInteger(cantidadNumerica)
    && cantidadNumerica >= 1
    && cantidadNumerica <= cantidadMaxima
  const estimado = cantidadValida ? centavos(cotizacion) * BigInt(cantidadNumerica) : null

  async function consultarPrediccion() {
    if (!compra || !session?.accessToken || consultandoPrediccion) return
    setConsultandoPrediccion(true)
    setErrorPrediccion('')
    try {
      setPrediccion(await obtenerPrediccion(session.accessToken, jugadorId))
    } catch (cause) {
      setPrediccion(null)
      setErrorPrediccion(cause instanceof ApiError && cause.status === 503
        ? 'El servicio de predicción no está disponible.'
        : 'No se pudo consultar la posible cotización.')
    } finally {
      setConsultandoPrediccion(false)
    }
  }

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session?.accessToken || !cantidadValida) return
    setProcesando(true)
    setError('')
    try {
      const orden = compra
        ? await comprarTokens(session.accessToken, jugadorId, cantidadNumerica)
        : await venderTokens(session.accessToken, jugadorId, cantidadNumerica)
      setResultado(orden)
      await refreshPortfolio()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo completar la operación.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="trade-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !procesando) onClose()
    }}>
      <section className="trade-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-title">
        <button className="trade-close" type="button" aria-label="Cerrar" onClick={onClose} disabled={procesando}>×</button>
        {resultado ? (
          <div className="trade-success" role="status">
            <span className="trade-success-icon" aria-hidden="true">✓</span>
            <p className="section-kicker">Operación confirmada</p>
            <h2 id="trade-title">{compra ? 'Compra realizada' : 'Venta realizada'}</h2>
            <p>{resultado.cantidadTokens} tokens de {nombreJugador}</p>
            <dl className="trade-summary">
              <div><dt>Cotización aplicada</dt><dd>{formatoCreditos(centavos(resultado.cotizacion))} cr</dd></div>
              <div><dt>{compra ? 'Total pagado' : 'Total acreditado'}</dt><dd>{formatoCreditos(centavos(resultado.importe))} cr</dd></div>
            </dl>
            <button className="primary-button" type="button" onClick={onClose}>Listo</button>
          </div>
        ) : (
          <form onSubmit={(event) => void confirmar(event)}>
            <p className="section-kicker">Mercado de tokens</p>
            <h2 id="trade-title">{compra ? 'Comprar' : 'Vender'} tokens</h2>
            <p className="trade-player-name">{nombreJugador}</p>
            <div className="trade-current-quote">
              <span>Cotización vigente</span>
              <strong>{formatoCreditos(centavos(cotizacion))} cr</strong>
            </div>
            {compra && (
              <div className="trade-prediction-block">
                <button
                  className="ai-prediction-button"
                  type="button"
                  disabled={consultandoPrediccion}
                  onClick={() => void consultarPrediccion()}
                >
                  <span aria-hidden="true">✦</span>
                  {consultandoPrediccion ? 'Consultando…' : 'Consultar posible cotización a 15 días'}
                </button>
                {prediccion && (() => {
                  const noDisponible = !prediccion.prediccionDisponible || prediccion.cotizacionPredicha === null
                  const fecha = prediccion.fechaObjetivo ? ` (${prediccion.fechaObjetivo})` : ''
                  const valorPredicho = noDisponible ? 'No disponible' : `${formatoCreditos(centavos(prediccion.cotizacionPredicha!))} cr`
                  return (
                    <div className="trade-prediction" aria-live="polite">
                      <span>Posible cotización</span>
                      <strong className={noDisponible ? 'trade-prediction-unavailable' : ''}>
                        {valorPredicho}
                      </strong>
                      <small>Estimación a 15 días{fecha}</small>
                      {prediccion.mensaje && <small className="trade-prediction-error" role="status">{prediccion.mensaje}</small>}
                    </div>
                  )
                })()}
                {errorPrediccion && <p className="trade-prediction-error" role="alert">{errorPrediccion}</p>}
              </div>
            )}
            <label className="trade-quantity-field">
              Cantidad de tokens
              <input
                autoFocus
                inputMode="numeric"
                type="number"
                min={1}
                max={cantidadMaxima}
                step={1}
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
                aria-describedby="trade-quantity-hint"
              />
            </label>
            <p className="trade-hint" id="trade-quantity-hint">
              {compra ? 'El máximo por jugador es 100 tokens.' : `Tenés hasta ${cantidadMaxima} tokens disponibles para vender.`}
            </p>
            <div className="trade-total-row">
              <span>{compra ? 'Total estimado' : 'Créditos a recibir'}</span>
              <strong>{estimado === null ? '—' : `${formatoCreditos(estimado)} cr`}</strong>
            </div>
            {error && <p className="trade-error" role="alert">{error}</p>}
            <div className="trade-actions">
              <button className="secondary-button" type="button" onClick={onClose} disabled={procesando}>Cancelar</button>
              <button className="primary-button" type="submit" disabled={!cantidadValida || procesando}>
                {procesando ? 'Procesando…' : compra ? 'Confirmar compra' : 'Confirmar venta'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
