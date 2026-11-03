import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 'token' } }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn(), useParams: () => ({ id: 'player-1' }) }))
const { obtenerPrediccion } = vi.hoisted(() => ({ obtenerPrediccion: vi.fn().mockResolvedValue({ estado: 'disponible', cotizacionActual: '10.00', cotizacionPredicha: '12.00', prediccionDisponible: true, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: 'model-1', versionEstrategia: 'ataque_decisivo@2', origenDatos: ['whoscored'], estadisticasPredichas: {} }) }))
vi.mock('../../players/players-api', () => ({
  obtenerJugador: vi.fn().mockResolvedValue({ id: 'player-1', nombre: 'Ana', nombreCompleto: null, posicion: null, fechaNacimiento: null, nacionalidad: null, fotoUrl: null, equipo: { id: 'e', nombre: 'Equipo', nombreCorto: null, sigla: null, escudoUrl: null }, liga: { id: 'l', codigo: 'L', nombre: 'Liga', pais: null, emblemaUrl: null }, estadisticasDisponibles: true, estadisticas: [{ goles: 1, asistencias: 1, tiros: 1, pasesClave: 1, regates: 1, faltasCometidas: 1, ratingWhoScored: 7 }] }),
  obtenerPrediccion,
}))
vi.mock('../../market/market-api', () => ({ listarHistorialCotizaciones: vi.fn().mockResolvedValue({ items: [] }), listarRanking: vi.fn().mockResolvedValue({ estrategia: null, jugadores: [] }) }))
vi.mock('../../players/PlayerStatsPanel', () => ({ PlayerStatsPanel: () => <div>stats</div> }))
vi.mock('../../market/QuoteHistoryPanel', () => ({ QuoteHistoryPanel: () => <div>history</div> }))

import { PlayerStatsPage } from '../../players/PlayerStatsPage'

describe('PlayerStatsPage', () => {
  it('muestra oficial, estimada y las versiones dentro de la vista', async () => {
    const user = userEvent.setup()
    render(<PlayerStatsPage />)
    const button = await screen.findByRole('button', { name: 'Consultar posible cotización a 15 días' })
    expect(obtenerPrediccion).not.toHaveBeenCalled()
    await user.click(button)
    expect(obtenerPrediccion).toHaveBeenCalledWith('token', 'player-1')
    expect(await screen.findByText('Posible cotización')).toBeInTheDocument()
    expect(screen.getByText('12,00 cr')).toBeInTheDocument()
    expect(screen.getByText('Estimación a 15 días (2026-11-17)')).toBeInTheDocument()
    expect(screen.queryByText('model-1')).not.toBeInTheDocument()
    expect(screen.queryByText('ataque_decisivo@2')).not.toBeInTheDocument()
  })
})
