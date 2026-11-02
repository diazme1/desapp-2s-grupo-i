import { useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import {
  recalcularCotizaciones,
  type EstrategiaCotizacion,
  type ResultadoRecalculo,
} from './market-api'

interface AdminQuotePanelProps {
  estrategiaActiva: EstrategiaCotizacion | null
  fechaActualizacion: string | null
  onComplete: () => Promise<void>
}

const estrategias: Array<{
  id: EstrategiaCotizacion
  nombre: string
  descripcion: string
  pesos: string[]
}> = [
  {
    id: 'ataque_decisivo',
    nombre: 'Ataque decisivo',
    descripcion: 'Premia las acciones que terminan o impulsan jugadas ofensivas.',
    pesos: ['Goles 35%', 'Asistencias 25%', 'Tiros 20%', 'Pases clave 5%', 'Regates 5%', 'Rating 5%', 'Faltas −5%'],
  },
  {
    id: 'creacion_tecnica',
    nombre: 'Creación técnica',
    descripcion: 'Da más peso a la creación de juego, los pases y los regates.',
    pesos: ['Goles 5%', 'Asistencias 15%', 'Tiros 5%', 'Pases clave 30%', 'Regates 25%', 'Rating 15%', 'Faltas −5%'],
  },
]

function nombreEstrategia(estrategia: EstrategiaCotizacion | null): string {
  return estrategias.find((item) => item.id === estrategia)?.nombre ?? 'Sin estrategia activa'
}

export function AdminQuotePanel({ estrategiaActiva, fechaActualizacion, onComplete }: AdminQuotePanelProps) {
  const { session } = useAuth()
  const [seleccionada, setSeleccionada] = useState<EstrategiaCotizacion>(estrategiaActiva ?? 'ataque_decisivo')
  const [confirmar, setConfirmar] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoRecalculo | null>(null)

  async function ejecutarRecalculo() {
    if (!session?.accessToken) return
    setProcesando(true)
    setConfirmar(false)
    setError('')
    setResultado(null)
    try {
      const response = await recalcularCotizaciones(session.accessToken, seleccionada)
      setResultado(response)
      await onComplete()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudieron recalcular las cotizaciones.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <section className="admin-quotes-panel" id="admin-quote-panel" aria-labelledby="admin-quote-title">
      <div className="admin-quotes-heading">
        <div>
          <p className="section-kicker">Espacio de superadmin</p>
          <h2 id="admin-quote-title">Administración de cotizaciones</h2>
          <p>Elegí el modelo que se usará para las próximas operaciones del mercado.</p>
        </div>
        <div className="admin-active-summary">
          <span>Activa</span>
          <strong>{nombreEstrategia(estrategiaActiva)}</strong>
          <small>{fechaActualizacion ? new Date(fechaActualizacion).toLocaleString('es-AR') : 'Todavía no se recalculó'}</small>
        </div>
      </div>

      <div className="strategy-grid">
        {estrategias.map((estrategia) => (
          <button
            className={`strategy-card${seleccionada === estrategia.id ? ' strategy-card-selected' : ''}`}
            type="button"
            key={estrategia.id}
            aria-pressed={seleccionada === estrategia.id}
            onClick={() => {
              setSeleccionada(estrategia.id)
              setConfirmar(false)
              setError('')
            }}
          >
            <span className="strategy-card-radio" aria-hidden="true">{seleccionada === estrategia.id ? '✓' : ''}</span>
            <span className="strategy-card-title">{estrategia.nombre}</span>
            <span className="strategy-card-description">{estrategia.descripcion}</span>
            <span className="strategy-card-weights">{estrategia.pesos.map((peso) => <span key={peso}>{peso}</span>)}</span>
            {estrategiaActiva === estrategia.id && <span className="strategy-active-tag">En uso</span>}
          </button>
        ))}
      </div>

      <div className="admin-quotes-footer">
        <p>El recálculo aplica a las estadísticas guardadas. Calcula ambos modelos y activa el que elegiste.</p>
        {!confirmar ? (
          <button className="primary-button" type="button" disabled={procesando} onClick={() => setConfirmar(true)}>
            Recalcular y activar
          </button>
        ) : (
          <div className="admin-confirm-actions" role="group" aria-label="Confirmar recálculo">
            <span>Esto actualizará las cotizaciones del mercado. ¿Continuar?</span>
            <button className="secondary-button" type="button" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="primary-button" type="button" disabled={procesando} onClick={() => void ejecutarRecalculo()}>
              {procesando ? 'Recalculando…' : 'Sí, recalcular'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="market-inline-error" role="alert">{error}</p>}
      {resultado && (
        <div className="recalculation-result" role="status">
          <strong>Recálculo completado</strong>
          <span>{resultado.jugadoresCotizados} jugadores cotizados</span>
          <span>{resultado.jugadoresSinEstadisticas} sin estadísticas</span>
          <span>Activa: {nombreEstrategia(resultado.estrategia)}</span>
        </div>
      )}
    </section>
  )
}
