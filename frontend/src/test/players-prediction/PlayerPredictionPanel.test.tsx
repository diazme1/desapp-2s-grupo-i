import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerPredictionPanel } from '../../players/PlayerPredictionPanel'

describe('PlayerPredictionPanel', () => {
  it('muestra la cotización estimada y su horizonte temporal', () => {
    render(<PlayerPredictionPanel prediccion={{ estado: 'disponible', cotizacionActual: '10.00', cotizacionPredicha: '12.35', prediccionDisponible: true, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: 'model-1', versionEstrategia: 'ataque_decisivo@2', origenDatos: ['whoscored'], estadisticasPredichas: {} }} />)
    expect(screen.getByText('Posible cotización')).toBeInTheDocument()
    expect(screen.getByText('12,35 cr')).toBeInTheDocument()
    expect(screen.getByText('Estimación a 15 días (2026-11-17)')).toBeInTheDocument()
    expect(screen.queryByText('model-1')).not.toBeInTheDocument()
    expect(screen.queryByText('ataque_decisivo@2')).not.toBeInTheDocument()
  })
})
