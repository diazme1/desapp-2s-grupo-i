import type { FiltrosCatalogo, OpcionFiltro } from './player-types'

interface PlayerFiltersProps {
  filtros: FiltrosCatalogo
  ligas: OpcionFiltro[]
  equipos: OpcionFiltro[]
  onChange: (next: Partial<FiltrosCatalogo>) => void
  onClear: () => void
}

export function PlayerFilters({ filtros, ligas, equipos, onChange, onClear }: PlayerFiltersProps) {
  const tieneFiltros = Boolean(
    filtros.nombre || filtros.ligaCodigo || filtros.equipoId || filtros.disponibilidadEstadisticas !== 'todas',
  )

  return (
    <section className="players-filters" aria-labelledby="players-filters-title">
      <div className="players-filters-heading">
        <div>
          <p className="section-kicker">Explorar</p>
          <h2 id="players-filters-title">Encontrá un jugador</h2>
        </div>
        {tieneFiltros && (
          <button className="clear-filters-button" type="button" onClick={onClear}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="players-filter-grid">
        <label className="filter-field filter-field-search">
          <span>Buscar por nombre</span>
          <input
            type="search"
            value={filtros.nombre}
            onChange={(event) => onChange({ nombre: event.target.value })}
            placeholder="Ej. Lionel Messi"
          />
        </label>
        <label className="filter-field">
          <span>Liga</span>
          <select value={filtros.ligaCodigo} onChange={(event) => onChange({ ligaCodigo: event.target.value, equipoId: '' })}>
            <option value="">Todas las ligas</option>
            {ligas.map((liga) => <option key={liga.value} value={liga.value}>{liga.label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Equipo</span>
          <select value={filtros.equipoId} onChange={(event) => onChange({ equipoId: event.target.value })}>
            <option value="">Todos los equipos</option>
            {equipos.map((equipo) => <option key={equipo.value} value={equipo.value}>{equipo.label}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Estadísticas</span>
          <select
            value={filtros.disponibilidadEstadisticas}
            onChange={(event) => onChange({ disponibilidadEstadisticas: event.target.value as FiltrosCatalogo['disponibilidadEstadisticas'] })}
          >
            <option value="todas">Todas</option>
            <option value="disponibles">Disponibles</option>
            <option value="no_disponibles">No disponibles</option>
          </select>
        </label>
      </div>
    </section>
  )
}
