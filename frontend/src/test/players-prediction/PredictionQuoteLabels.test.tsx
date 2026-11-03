import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerPredictionPanel } from '../../players/PlayerPredictionPanel'

describe('etiquetas de cotización', () => {
  it('distingue la cotización oficial de la estimada', () => {
    render(<PlayerPredictionPanel prediccion={{ estado: 'disponible', cotizacionActual: '20.00', cotizacionPredicha: '21.00', prediccionDisponible: true, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: 'm1', versionEstrategia: 'e1', origenDatos: ['app'], estadisticasPredichas: {} }} />)
    expect(screen.getByText('Cotización actual').nextElementSibling).toHaveTextContent('20.00 cr')
    expect(screen.getByText('Cotización predicha').nextElementSibling).toHaveTextContent('21.00 cr')
  })
})
