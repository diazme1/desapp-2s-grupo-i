import request from 'supertest';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { TokenJugadorEntity } from '../../../src/market/persistence/token-jugador.entity';
import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { HistorialCotizacionService } from '../../../src/quotes/historial-cotizacion.service';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from './players-integration-app';

describe('lecturas locales sin proveedor externo', () => {
  let integration: PlayersIntegrationApp;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({
      obtenerCatalogo: jest.fn().mockRejectedValue(new Error('proveedor no disponible')),
    });
    await integration.resetData();
    const now = new Date('2026-01-01T00:00:00.000Z');
    await integration.dataSource.getRepository(LigaEntity).save({
      id: '2c2eb773-a1d7-4fa8-863e-3df115ce0201',
      proveedorId: 9911,
      codigo: 'LOCAL',
      nombre: 'Liga Local',
      pais: null,
      emblemaUrl: null,
      creadoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(EquipoEntity).save({
      id: '6c0fe8a3-91f4-40a2-a836-8329a3b0f201',
      proveedorId: 9912,
      nombre: 'Local FC',
      nombreCorto: null,
      sigla: null,
      escudoUrl: null,
      liga: { id: '2c2eb773-a1d7-4fa8-863e-3df115ce0201' },
      creadoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(JugadorEntity).save({
      id: 'd4fd866a-1c58-4423-99eb-56e70d745201',
      proveedorId: 9913,
      nombre: 'Jugador Local',
      nombreCompleto: null,
      posicion: null,
      fechaNacimiento: null,
      nacionalidad: null,
      equipo: { id: '6c0fe8a3-91f4-40a2-a836-8329a3b0f201' },
      creadoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(UserEntity).save({
      id: 'd4fd866a-1c58-4423-99eb-56e70d745202',
      correo: 'local-owner@example.com',
      passwordHash: 'hash',
      rol: 'usuario',
      creadoEn: now,
    });
    await integration.dataSource.getRepository(TokenJugadorEntity).save({
      idToken: 'd4fd866a-1c58-4423-99eb-56e70d745203',
      jugadorId: 'd4fd866a-1c58-4423-99eb-56e70d745201',
      usuarioOwnerId: 'd4fd866a-1c58-4423-99eb-56e70d745202',
      numeroEmision: 1,
      loteEmisionId: 'd4fd866a-1c58-4423-99eb-56e70d745204',
      emitidoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(EstadisticasJugadorEntity).save({
      id: 'd4fd866a-1c58-4423-99eb-56e70d745205',
      jugador: { id: 'd4fd866a-1c58-4423-99eb-56e70d745201' },
      goles: 0,
      asistencias: null,
      tiros: null,
      pasesClave: null,
      regates: null,
      faltasCometidas: null,
      ratingWhoScored: null,
    });
    await integration.dataSource.getRepository(HistorialCotizacionEntity).save({
      id: 'd4fd866a-1c58-4423-99eb-56e70d745206',
      jugador: { id: 'd4fd866a-1c58-4423-99eb-56e70d745201' },
      fechaHora: now,
      cotizacion: Cotizacion.fromDecimal('83.75'),
      tipoEstrategia: 'local',
      idVersionEstrategia: 'd4fd866a-1c58-4423-99eb-56e70d745207',
      idRecalculo: 'd4fd866a-1c58-4423-99eb-56e70d745208',
      estadistica: { id: 'd4fd866a-1c58-4423-99eb-56e70d745205' },
    });
  });

  afterAll(async () => integration?.close());

  it('sirve el catálogo local sin llamar al proveedor', async () => {
    const response = await request(integration.app.getHttpServer())
      .get('/players')
      .expect(200);

    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ nombre: 'Jugador Local' }),
    ]));
    const quoteHistory = await integration.app
      .get(HistorialCotizacionService)
      .listar('d4fd866a-1c58-4423-99eb-56e70d745201', { page: 1, limit: 20 } as any);
    expect(quoteHistory.items[0].cotizacion).toBeInstanceOf(Cotizacion);
    expect(
      await integration.dataSource.getRepository(TokenJugadorEntity).findOneBy({
        idToken: 'd4fd866a-1c58-4423-99eb-56e70d745203',
      }),
    ).not.toBeNull();
    expect(integration.source.obtenerCatalogo).not.toHaveBeenCalled();
  });
});
