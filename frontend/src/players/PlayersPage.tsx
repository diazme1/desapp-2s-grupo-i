import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { listarJugadores } from './players-api'
import { obtenerOpcionesEquipo, obtenerOpcionesLiga, filtrarJugadores } from './player-filters'
import { PlayerCard } from './PlayerCard'
import { PlayerFilters } from './PlayerFilters'
import { filtrosCatalogoIniciales, type EstadoCatalogo, type FiltrosCatalogo, type JugadorCatalogo } from './player-types'
import './players.css'

const JUGADORES_POR_PAGINA = 50

type ElementoPaginacion = number | 'ellipsis'

function construirPaginasVisibles(actual: number, total: number): ElementoPaginacion[] {
  const candidatas = [1, actual - 1, actual, actual + 1, total]
    .filter((pagina) => pagina >= 1 && pagina <= total)
  const paginas = [...new Set(candidatas)].sort((a, b) => a - b)

  return paginas.flatMap((pagina, index) => {
    const anterior = paginas[index - 1]
    return index > 0 && pagina - anterior > 1 ? ['ellipsis' as const, pagina] : [pagina]
  })
}

interface PlayersPageProps {
  onLogout: () => void
}

export function PlayersPage({ onLogout }: PlayersPageProps) {
  const { session, user } = useAuth()
  const [jugadores, setJugadores] = useState<JugadorCatalogo[]>([])
  const [estado, setEstado] = useState<EstadoCatalogo>('cargando')
  const [mensajeError, setMensajeError] = useState('')
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(filtrosCatalogoIniciales)
  const [paginaActual, setPaginaActual] = useState(1)

  const cargarJugadores = useCallback(async () => {
    if (!session?.accessToken) return
    setEstado('cargando')
    setMensajeError('')
    try {
      const resultado = await listarJugadores(session.accessToken)
      setJugadores(resultado)
      setEstado('cargado')
    } catch (error) {
      setEstado('error')
      setMensajeError(error instanceof ApiError ? error.message : 'No se pudo cargar el catálogo de jugadores.')
    }
  }, [session?.accessToken])

  useEffect(() => {
    void cargarJugadores()
  }, [cargarJugadores])

  const jugadoresVisibles = useMemo(() => filtrarJugadores(jugadores, filtros), [jugadores, filtros])
  const opcionesLiga = useMemo(() => obtenerOpcionesLiga(jugadores), [jugadores])
  const opcionesEquipo = useMemo(() => obtenerOpcionesEquipo(jugadores, filtros.ligaCodigo), [jugadores, filtros.ligaCodigo])
  const jugadoresConEstadisticas = useMemo(
    () => jugadores.filter((jugador) => jugador.estadisticasDisponibles === true).length,
    [jugadores],
  )
  const cantidadPaginas = Math.max(1, Math.ceil(jugadoresVisibles.length / JUGADORES_POR_PAGINA))
  const jugadoresPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * JUGADORES_POR_PAGINA
    return jugadoresVisibles.slice(inicio, inicio + JUGADORES_POR_PAGINA)
  }, [jugadoresVisibles, paginaActual])
  const paginasVisibles = useMemo(
    () => construirPaginasVisibles(paginaActual, cantidadPaginas),
    [paginaActual, cantidadPaginas],
  )
  const primerResultado = jugadoresVisibles.length === 0
    ? 0
    : (paginaActual - 1) * JUGADORES_POR_PAGINA + 1
  const ultimoResultado = Math.min(paginaActual * JUGADORES_POR_PAGINA, jugadoresVisibles.length)

  function actualizarFiltros(next: Partial<FiltrosCatalogo>) {
    setPaginaActual(1)
    setFiltros((actuales) => ({ ...actuales, ...next }))
  }

  return (
    <main className="players-page">
      <span className="players-ball-watermark" aria-hidden="true">⚽</span>
      <header className="players-header">
        <div className="players-heading-copy">
          <div className="players-kicker-row">
            <p className="players-eyebrow">SCOUTING DATABASE</p>
            <span className="catalog-live"><span aria-hidden="true" /> Catálogo activo</span>
          </div>
          <h1>Catálogo <span>de jugadores</span></h1>
          <p className="players-intro">Explorá perfiles, equipos y rendimiento disponible desde una única mesa de análisis.</p>
        </div>
        <div className="players-header-side">
          <div className="catalog-metrics" aria-label="Resumen del catálogo">
            <div>
              <strong>{jugadores.length.toLocaleString('es-AR')}</strong>
              <span>perfiles<br />en catálogo</span>
            </div>
            <div>
              <strong>{jugadoresConEstadisticas.toLocaleString('es-AR')}</strong>
              <span>con datos<br />de rendimiento</span>
            </div>
          </div>
          <div className="players-header-actions">
            <span className="user-label">{user?.correo}</span>
            <button className="text-button" type="button" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      {estado === 'cargado' && (
        <PlayerFilters
          filtros={filtros}
          ligas={opcionesLiga}
          equipos={opcionesEquipo}
          onChange={actualizarFiltros}
          onClear={() => {
            setPaginaActual(1)
            setFiltros(filtrosCatalogoIniciales)
          }}
        />
      )}

      <section className="players-content" aria-live="polite">
        {estado === 'cargando' && <div className="players-status" role="status">Cargando catálogo de jugadores…</div>}
        {estado === 'error' && (
          <div className="players-status players-status-error" role="alert">
            <h2>No pudimos cargar el catálogo</h2>
            <p>{mensajeError}</p>
            <button className="primary-button" type="button" onClick={() => void cargarJugadores()}>Reintentar</button>
          </div>
        )}
        {estado === 'cargado' && jugadores.length === 0 && (
          <div className="players-status" role="status">
            <h2>El catálogo está vacío</h2>
            <p>Cuando haya jugadores disponibles, los vas a encontrar acá.</p>
          </div>
        )}
        {estado === 'cargado' && jugadores.length > 0 && jugadoresVisibles.length === 0 && (
          <div className="players-status" role="status">
            <h2>No encontramos jugadores</h2>
            <p>Probá con otros filtros o limpiá la búsqueda para volver a ver el catálogo.</p>
            <button className="secondary-button" type="button" onClick={() => setFiltros(filtrosCatalogoIniciales)}>Limpiar filtros</button>
          </div>
        )}
        {estado === 'cargado' && jugadoresVisibles.length > 0 && (
          <>
            <div className="players-results-heading">
              <div>
                <span className="results-kicker">PERFILES ENCONTRADOS</span>
                <p><strong>{jugadoresVisibles.length}</strong> {jugadoresVisibles.length === 1 ? 'jugador encontrado' : 'jugadores encontrados'}</p>
              </div>
              <span className="results-order">MOSTRANDO {primerResultado}–{ultimoResultado} · ORDENADOS POR NOMBRE</span>
            </div>
            <div className="players-grid">
              {jugadoresPagina.map((jugador) => <PlayerCard key={jugador.id} jugador={jugador} />)}
            </div>
            {cantidadPaginas > 1 && (
              <nav className="players-pagination" aria-label="Paginación del catálogo">
                <button
                  className="pagination-control"
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                >
                  Anterior
                </button>
                <div className="pagination-pages">
                  {paginasVisibles.map((pagina, index) => pagina === 'ellipsis' ? (
                    <span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
                  ) : (
                    <button
                      className={`pagination-page${pagina === paginaActual ? ' pagination-page-active' : ''}`}
                      type="button"
                      key={pagina}
                      aria-label={`Ir a la página ${pagina}`}
                      aria-current={pagina === paginaActual ? 'page' : undefined}
                      onClick={() => setPaginaActual(pagina)}
                    >
                      {pagina}
                    </button>
                  ))}
                </div>
                <button
                  className="pagination-control"
                  type="button"
                  disabled={paginaActual === cantidadPaginas}
                  onClick={() => setPaginaActual((pagina) => Math.min(cantidadPaginas, pagina + 1))}
                >
                  Siguiente
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  )
}
