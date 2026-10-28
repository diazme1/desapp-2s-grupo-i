import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from '../players/players-integration-app';

describe('persistencia exacta de cotizaciones', () => {
  let integration: PlayersIntegrationApp;
  const playerId = 'd4fd866a-1c58-4423-99eb-56e70d745301';
  const teamId = '6c0fe8a3-91f4-40a2-a836-8329a3b0f301';
  const leagueId = '2c2eb773-a1d7-4fa8-863e-3df115ce0301';
  const statsId = '150b06ef-c482-4584-b4be-17b455b68301';

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({ obtenerCatalogo: jest.fn() });
    const now = new Date('2026-01-01T00:00:00.000Z');
    await integration.dataSource.query(
      `INSERT INTO ligas (id, proveedor_id, codigo, nombre, creado_en, actualizado_en)
       VALUES ($1, 9931, 'PREC', 'Precision League', $2, $2)`,
      [leagueId, now],
    );
    await integration.dataSource.query(
      `INSERT INTO equipos (id, proveedor_id, liga_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9932, $2, 'Precision FC', $3, $3)`,
      [teamId, leagueId, now],
    );
    await integration.dataSource.query(
      `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9933, $2, 'Precision Player', $3, $3)`,
      [playerId, teamId, now],
    );
    await integration.dataSource.getRepository(EstadisticasJugadorEntity).save({
      id: statsId,
      jugador: { id: playerId },
      goles: null,
      asistencias: null,
      tiros: null,
      pasesClave: null,
      regates: null,
      faltasCometidas: null,
      ratingWhoScored: null,
    });
  });

  afterAll(async () => integration?.close());

  it('conserva las unidades exactas en el round-trip numeric(14,2)', async () => {
    await integration.dataSource.getRepository(HistorialCotizacionEntity).save({
      id: '9948e5b3-35fa-4104-baf4-93d593fa0301',
      jugador: { id: playerId },
      fechaHora: new Date('2026-03-01T00:00:00.000Z'),
      cotizacion: Cotizacion.fromUnidades(8375n),
      tipoEstrategia: 'ataque_decisivo',
      idVersionEstrategia: '3b8c2818-ce16-44c2-9c83-22270d745301',
      idRecalculo: 'c9913672-bf68-49ca-9b0a-521f6f6d0301',
      estadistica: { id: statsId },
    });

    const row = await integration.dataSource
      .getRepository(HistorialCotizacionEntity)
      .findOneByOrFail({ id: '9948e5b3-35fa-4104-baf4-93d593fa0301' });

    expect(row.cotizacion).toBeInstanceOf(Cotizacion);
    expect((row.cotizacion as Cotizacion).toUnidades()).toBe(8375n);
    const raw = await integration.dataSource.query(
      'SELECT cotizacion::text AS cotizacion FROM historial_cotizacion WHERE id = $1',
      ['9948e5b3-35fa-4104-baf4-93d593fa0301'],
    );
    expect(raw[0].cotizacion).toBe('83.75');
  });
});
