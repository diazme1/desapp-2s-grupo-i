import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 'token' } }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useParams: () => ({ id: 'player-1' }) }))
vi.mock('../../players/players-api', () => ({
  obtenerJugador: vi.fn().mockResolvedValue({ id: 'player-1', nombre: 'Ana', nombreCompleto: null, posicion: null, fechaNacimiento: null, nacionalidad: null, fotoUrl: null, equipo: { id: 'e', nombre: 'Equipo', nombreCorto: null, sigla: null, escudoUrl: null }, liga: { id: 'l', codigo: 'L', nombre: 'Liga', pais: null, emblemaUrl: null }, estadisticasDisponibles: true, estadisticas: [{ goles: 1, asistencias: 1, tiros: 1, pasesClave: 1, regates: 1, faltasCometidas: 1, ratingWhoScored: 7 }] }),
  obtenerPrediccion: vi.fn().mockResolvedValue({ estado: 'disponible', cotizacionActual: '10.00', cotizacionPredicha: '12.00', prediccionDisponible: true, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: 'model-1', versionEstrategia: 'ataque_decisivo@2', origenDatos: ['whoscored'], estadisticasPredichas: {} }),
}))
vi.mock('../../market/market-api', () => ({ listarHistorialCotizaciones: vi.fn().mockResolvedValue({ items: [] }), listarRanking: vi.fn().mockResolvedValue({ estrategia: null, jugadores: [] }) }))
vi.mock('../../players/PlayerStatsPanel', () => ({ PlayerStatsPanel: () => <div>stats</div> }))
vi.mock('../../market/QuoteHistoryPanel', () => ({ QuoteHistoryPanel: () => <div>history</div> }))

import { PlayerStatsPage } from '../../players/PlayerStatsPage'

describe('PlayerStatsPage', () => {
  it('muestra oficial, estimada y las versiones dentro de la vista', async () => {
    render(<PlayerStatsPage />)
    expect(await screen.findByText('Cotización actual')).toBeInTheDocument()
    expect(screen.getByText('Cotización predicha')).toBeInTheDocument()
    expect(screen.getByText('model-1')).toBeInTheDocument()
    expect(screen.getByText('ataque_decisivo@2')).toBeInTheDocument()
  })
})
