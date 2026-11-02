import { useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import {
  listarConfiguracionesEstrategia,
  recalcularCotizaciones,
  type ConfiguracionEstrategiaCotizacion,
  type EstrategiaCotizacion,
  type PesosEstrategiaCotizacion,
  type PesosPorEstrategia,
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
}> = [
  {
    id: 'ataque_decisivo',
    nombre: 'Ataque decisivo',
    descripcion: 'Premia las acciones que terminan o impulsan jugadas ofensivas.',
  },
  {
    id: 'creacion_tecnica',
    nombre: 'Creación técnica',
    descripcion: 'Da más peso a la creación de juego, los pases y los regates.',
  },
]

const metricas: Array<{ clave: keyof PesosEstrategiaCotizacion; nombre: string }> = [
  { clave: 'goles', nombre: 'Goles' },
  { clave: 'asistencias', nombre: 'Asistencias' },
  { clave: 'tiros', nombre: 'Tiros' },
  { clave: 'pasesClave', nombre: 'Pases clave' },
  { clave: 'regates', nombre: 'Regates' },
  { clave: 'rating', nombre: 'Rating' },
  { clave: 'faltasCometidas', nombre: 'Faltas cometidas' },
]

function nombreEstrategia(estrategia: EstrategiaCotizacion | null): string {
  return estrategias.find((item) => item.id === estrategia)?.nombre ?? 'Sin estrategia activa'
}

function sumarPesos(pesos: PesosEstrategiaCotizacion): number {
  return Object.values(pesos).reduce((total, peso) => total + peso, 0)
}

function mapearPesos(configuraciones: ConfiguracionEstrategiaCotizacion[]): PesosPorEstrategia {
  return Object.fromEntries(configuraciones.map((configuracion) => [
    configuracion.tipoEstrategia,
    configuracion.pesos,
  ])) as PesosPorEstrategia
}

export function AdminQuotePanel({ estrategiaActiva, fechaActualizacion, onComplete }: AdminQuotePanelProps) {
  const { session } = useAuth()
  const [seleccionada, setSeleccionada] = useState<EstrategiaCotizacion>(estrategiaActiva ?? 'ataque_decisivo')
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionEstrategiaCotizacion[]>([])
  const [pesosGuardados, setPesosGuardados] = useState<PesosPorEstrategia | null>(null)
  const [pesosEditados, setPesosEditados] = useState<PesosPorEstrategia | null>(null)
  const [cargandoConfiguracion, setCargandoConfiguracion] = useState(true)
  const [intentoCarga, setIntentoCarga] = useState(0)
  const [confirmar, setConfirmar] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoRecalculo | null>(null)

  useEffect(() => {
    let vigente = true
    async function cargarConfiguracion() {
      if (!session?.accessToken) return
      setCargandoConfiguracion(true)
      setError('')
      try {
        const respuesta = await listarConfiguracionesEstrategia(session.accessToken)
        if (!vigente) return
        const pesos = mapearPesos(respuesta.estrategias)
        setConfiguraciones(respuesta.estrategias)
        setPesosGuardados(pesos)
        setPesosEditados(pesos)
      } catch (cause) {
        if (!vigente) return
        setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar las configuraciones de cotización.')
      } finally {
        if (vigente) setCargandoConfiguracion(false)
      }
    }
    void cargarConfiguracion()
    return () => { vigente = false }
  }, [session?.accessToken, intentoCarga])

  useEffect(() => {
    if (estrategiaActiva) setSeleccionada(estrategiaActiva)
  }, [estrategiaActiva])

  const pesosValidos = Boolean(pesosEditados && estrategias.every(({ id }) => sumarPesos(pesosEditados[id]) === 100))
  const hayCambios = Boolean(pesosGuardados && pesosEditados && estrategias.some(({ id }) =>
    metricas.some(({ clave }) => pesosGuardados[id][clave] !== pesosEditados[id][clave]),
  ))
  const necesitaGuardar = hayCambios || configuraciones.some((item) => !item.persistida)

  function editarPeso(estrategia: EstrategiaCotizacion, metrica: keyof PesosEstrategiaCotizacion, valor: string) {
    const peso = valor === '' ? 0 : Number(valor)
    setPesosEditados((actuales) => actuales ? {
      ...actuales,
      [estrategia]: { ...actuales[estrategia], [metrica]: peso },
    } : actuales)
    setConfirmar(false)
    setResultado(null)
  }

  async function ejecutarRecalculo() {
    if (!session?.accessToken || !pesosEditados || !pesosValidos) return
    setProcesando(true)
    setConfirmar(false)
    setError('')
    setResultado(null)
    try {
      const response = await recalcularCotizaciones(session.accessToken, seleccionada, pesosEditados)
      setResultado(response)
      await onComplete()
      const configuracionActualizada = await listarConfiguracionesEstrategia(session.accessToken)
      const pesos = mapearPesos(configuracionActualizada.estrategias)
      setConfiguraciones(configuracionActualizada.estrategias)
      setPesosGuardados(pesos)
      setPesosEditados(pesos)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudieron guardar los pesos y recalcular las cotizaciones.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <section className="admin-quotes-panel" id="admin-quote-panel" aria-labelledby="admin-quote-title">
      <div className="admin-quotes-heading">
        <div>
          <p className="section-kicker">Espacio de superadmin</p>
          <div className="admin-quote-title-row">
            <h2 id="admin-quote-title">Administración de cotizaciones</h2>
            <span className="admin-quote-help">
              <button type="button" aria-label="Cómo se calcula la cotización" aria-describedby="admin-quote-formula">?</button>
              <span id="admin-quote-formula" role="tooltip">Cotización = máximo entre 0 y (1 + suma de métrica × peso / 100). Un peso de 0% excluye esa métrica; las faltas restan.</span>
            </span>
          </div>
          <p>Configurá cuánto influye cada métrica. Los pesos deben sumar 100% en cada estrategia.</p>
        </div>
        <div className="admin-active-summary">
          <span>Activa para operaciones</span>
          <strong>{nombreEstrategia(estrategiaActiva)}</strong>
          <small>{fechaActualizacion ? new Date(fechaActualizacion).toLocaleString('es-AR') : 'Todavía no se recalculó'}</small>
        </div>
      </div>

      {cargandoConfiguracion ? (
        <p className="admin-config-status" role="status">Cargando pesos guardados…</p>
      ) : pesosEditados && (
        <div className="strategy-grid">
          {estrategias.map((estrategia) => {
            const pesos = pesosEditados[estrategia.id]
            const total = sumarPesos(pesos)
            const configuracion = configuraciones.find((item) => item.tipoEstrategia === estrategia.id)
            const version = configuracion?.numeroVersion ?? 1
            const cambioEnEsta = Boolean(pesosGuardados && metricas.some(({ clave }) =>
              pesosGuardados[estrategia.id][clave] !== pesos[clave],
            ))
            return (
              <article className={`strategy-card${seleccionada === estrategia.id ? ' strategy-card-selected' : ''}`} key={estrategia.id}>
                <div className="strategy-card-heading">
                  <label className="strategy-card-select">
                    <input
                      type="radio"
                      name="estrategia-activa"
                      checked={seleccionada === estrategia.id}
                      onChange={() => {
                        setSeleccionada(estrategia.id)
                        setConfirmar(false)
                        setError('')
                      }}
                    />
                    <span className="strategy-card-title">{estrategia.nombre}</span>
                  </label>
                  {estrategiaActiva === estrategia.id && <span className="strategy-active-tag">En uso</span>}
                </div>
                <p className="strategy-card-description">{estrategia.descripcion}</p>
                <small className="strategy-version">{configuracion?.persistida ? `Versión guardada: ${version}` : 'Configuración inicial sin guardar'}{cambioEnEsta ? ' · nueva versión al aplicar' : ''}</small>
                <div className="strategy-metric-weights">
                  {metricas.map(({ clave, nombre }) => (
                    <label className="strategy-metric-field" key={clave}>
                      <span>{nombre}{clave === 'faltasCometidas' && <small> resta</small>}</span>
                      <span className="strategy-weight-input">
                        {clave === 'faltasCometidas' && <small aria-hidden="true">−</small>}
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={pesos[clave]}
                          aria-label={`Peso de ${nombre} para ${estrategia.nombre}`}
                          onChange={(event) => editarPeso(estrategia.id, clave, event.target.value)}
                        />
                        <small>%</small>
                      </span>
                    </label>
                  ))}
                </div>
                <p className={`strategy-weight-total${total === 100 ? '' : ' is-invalid'}`} aria-live="polite">
                  Total de pesos <strong>{total}% / 100%</strong>
                </p>
              </article>
            )
          })}
        </div>
      )}

      {!cargandoConfiguracion && pesosEditados && (
        <div className="admin-quotes-footer">
          <p>Al aplicar, se guardan las configuraciones pendientes como versiones inmutables, se recalculan ambas estrategias y se activa la elegida. Las faltas restan al score.</p>
          {!confirmar ? (
            <button className="primary-button" type="button" disabled={procesando || !pesosValidos} onClick={() => setConfirmar(true)}>
              {necesitaGuardar ? 'Guardar pesos, recalcular y activar' : 'Recalcular y activar'}
            </button>
          ) : (
            <div className="admin-confirm-actions" role="group" aria-label="Confirmar recálculo">
              <span>{necesitaGuardar ? 'Se guardarán nuevas versiones y se actualizarán las cotizaciones. ¿Continuar?' : 'Se actualizarán las cotizaciones con los pesos guardados. ¿Continuar?'}</span>
              <button className="secondary-button" type="button" onClick={() => setConfirmar(false)}>Cancelar</button>
              <button className="primary-button" type="button" disabled={procesando} onClick={() => void ejecutarRecalculo()}>
                {procesando ? 'Aplicando…' : 'Sí, aplicar'}
              </button>
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="admin-config-error" role="alert">
          <p className="market-inline-error">{error}</p>
          {!pesosEditados && !cargandoConfiguracion && (
            <button className="secondary-button" type="button" onClick={() => setIntentoCarga((intento) => intento + 1)}>Reintentar</button>
          )}
        </div>
      )}
      {resultado && (
        <div className="recalculation-result" role="status">
          <strong>Recálculo completado · versión {resultado.versionEstrategia}</strong>
          <span>{resultado.jugadoresCotizados} jugadores cotizados</span>
          <span>{resultado.jugadoresSinEstadisticas} sin estadísticas</span>
          <span>Activa: {nombreEstrategia(resultado.estrategia)}</span>
        </div>
      )}
    </section>
  )
}
