import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerPredictionPanel } from '../../players/PlayerPredictionPanel'

describe('PlayerPredictionPanel', () => {
  it('muestra cotización oficial, estimada y versiones', () => {
    render(<PlayerPredictionPanel prediccion={{ estado: 'disponible', cotizacionActual: '10.00', cotizacionPredicha: '12.35', prediccionDisponible: true, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: 'model-1', versionEstrategia: 'ataque_decisivo@2', origenDatos: ['whoscored'], estadisticasPredichas: {} }} />)
    expect(screen.getByText('Cotización actual')).toBeInTheDocument()
    expect(screen.getByText('Cotización predicha')).toBeInTheDocument()
    expect(screen.getByText('model-1')).toBeInTheDocument()
    expect(screen.getByText('ataque_decisivo@2')).toBeInTheDocument()
  })
})
