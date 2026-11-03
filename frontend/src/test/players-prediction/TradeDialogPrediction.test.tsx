import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const { obtenerPrediccion } = vi.hoisted(() => ({
  obtenerPrediccion: vi.fn().mockResolvedValue({
    estado: 'disponible',
    cotizacionActual: '10.00',
    cotizacionPredicha: '12.35',
    prediccionDisponible: true,
    fechaGeneracion: '2026-11-02T00:00:00Z',
    fechaObjetivo: '2026-11-17',
    versionModelo: 'model-1',
    versionEstrategia: 'ataque_decisivo@2',
    origenDatos: ['whoscored'],
    estadisticasPredichas: {},
  }),
}))

vi.mock('../../auth/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 'token' } }) }))
vi.mock('../../market/market-context', () => ({ useMarket: () => ({ refreshPortfolio: vi.fn() }) }))
vi.mock('../../players/players-api', () => ({ obtenerPrediccion }))
vi.mock('../../market/market-api', () => ({ comprarTokens: vi.fn(), venderTokens: vi.fn() }))

import { TradeDialog } from '../../market/TradeDialog'

describe('TradeDialog prediction', () => {
  it('does not request the prediction until the user presses the button', async () => {
    const user = userEvent.setup()
    render(<TradeDialog jugadorId="player-1" nombreJugador="Ana" cotizacion="10.00" lado="compra" onClose={vi.fn()} />)

    expect(obtenerPrediccion).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Consultar posible cotización a 15 días' }))

    expect(obtenerPrediccion).toHaveBeenCalledWith('token', 'player-1')
    expect(await screen.findByText('Posible cotización')).toBeInTheDocument()
    expect(screen.getByText('12,35 cr')).toBeInTheDocument()
    expect(screen.getByText('Estimación a 15 días (2026-11-17)')).toBeInTheDocument()
  })
})
