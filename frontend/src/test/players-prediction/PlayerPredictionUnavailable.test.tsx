import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerPredictionPanel } from '../../players/PlayerPredictionPanel'

describe('predicción no disponible', () => {
  it('informa la ausencia sin ocultar el concepto de estimación', () => {
    render(<PlayerPredictionPanel prediccion={{ estado: 'no_disponible', cotizacionActual: '20.00', cotizacionPredicha: null, prediccionDisponible: false, fechaGeneracion: '2026-11-02T00:00:00Z', fechaObjetivo: '2026-11-17', versionModelo: null, versionEstrategia: null, origenDatos: [], estadisticasPredichas: null, mensaje: 'No hay modelo aprobado.' }} />)
    expect(screen.getByText('Posible cotización')).toBeInTheDocument()
    expect(screen.getByText('No disponible')).toBeInTheDocument()
    expect(screen.getByText('Estimación a 15 días (2026-11-17)')).toBeInTheDocument()
    expect(screen.getByText('No hay modelo aprobado.')).toBeInTheDocument()
  })
})
