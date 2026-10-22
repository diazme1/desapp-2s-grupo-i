import request from 'supertest';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from './players-integration-app';

const LEAGUE_ID = '2c2eb773-a1d7-4fa8-863e-3df115ce0071';
const TEAM_ID = '6c0fe8a3-91f4-40a2-a836-8329a3b0fb73';
const PLAYER_ID = 'd4fd866a-1c58-4423-99eb-56e70a054bb4';
const EMPTY_PLAYER_ID = '716fdb42-7681-4cf4-9c19-78b267f43ef6';
const STATS_ID = '150b06ef-c482-4584-b4be-17b455b686bd';
const STRATEGY_VERSION_ID = '3b8c2818-ce16-44c2-9c83-22270d745f04';
const RECALCULATION_ID = 'c9913672-bf68-49ca-9b0a-521f6f6d8ea4';
const QUOTE_IDS = [
  '9948e5b3-35fa-4104-baf4-93d593fa9a01',
  '9948e5b3-35fa-4104-baf4-93d593fa9a02',
  '9948e5b3-35fa-4104-baf4-93d593fa9a03',
];

describe('GET /players/:id/quotes', () => {
  let integration: PlayersIntegrationApp;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({
      obtenerCatalogo: jest.fn(),
    });
  });

  beforeEach(async () => {
    await integration.resetData();
    const now = new Date('2026-01-01T00:00:00.000Z');
    await integration.dataSource.getRepository(LigaEntity).save({
      id: LEAGUE_ID,
      proveedorId: 901,
      codigo: 'QH',
      nombre: 'Quotes League',
      pais: null,
      emblemaUrl: null,
      creadoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(EquipoEntity).save({
      id: TEAM_ID,
      proveedorId: 902,
      nombre: 'History FC',
      nombreCorto: null,
      sigla: null,
      escudoUrl: null,
      liga: { id: LEAGUE_ID },
      creadoEn: now,
      actualizadoEn: now,
    });
    await integration.dataSource.getRepository(JugadorEntity).save([
      {
        id: PLAYER_ID,
        proveedorId: 903,
        nombre: 'Cotización Uno',
        nombreCompleto: null,
        posicion: null,
        fechaNacimiento: null,
        nacionalidad: null,
        equipo: { id: TEAM_ID },
        creadoEn: now,
        actualizadoEn: now,
      },
      {
        id: EMPTY_PLAYER_ID,
        proveedorId: 904,
        nombre: 'Sin Historial',
        nombreCompleto: null,
        posicion: null,
        fechaNacimiento: null,
        nacionalidad: null,
        equipo: { id: TEAM_ID },
        creadoEn: now,
        actualizadoEn: now,
      },
    ]);
    await integration.dataSource.getRepository(EstadisticasJugadorEntity).save({
      id: STATS_ID,
      jugador: { id: PLAYER_ID },
      goles: 12,
      asistencias: null,
      tiros: null,
      pasesClave: null,
      regates: null,
      faltasCometidas: null,
      ratingWhoScored: null,
    });
    const rows = [
      { fechaHora: new Date('2026-01-01T00:00:00.000Z'), cotizacion: 65.25 },
      { fechaHora: new Date('2026-02-01T00:00:00.000Z'), cotizacion: 72.5 },
      { fechaHora: new Date('2026-03-01T00:00:00.000Z'), cotizacion: 83.75 },
    ];
    await integration.dataSource.getRepository(HistorialCotizacionEntity).save(
      rows.map((row, index) => ({
        id: QUOTE_IDS[index],
        jugador: { id: PLAYER_ID },
        fechaHora: row.fechaHora,
        cotizacion: row.cotizacion,
        tipoEstrategia: 'ataque_decisivo',
        idVersionEstrategia: STRATEGY_VERSION_ID,
        idRecalculo: RECALCULATION_ID,
        estadistica: { id: STATS_ID },
      })),
    );
  });

  afterAll(async () => integration?.close());

  it('ordena desde la cotización más reciente y pagina con límite y total', async () => {
    const response = await request(integration.app.getHttpServer())
      .get(`/players/${PLAYER_ID}/quotes?page=1&limit=2`)
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
      QUOTE_IDS[2],
      QUOTE_IDS[1],
    ]);
    expect(response.body.items[0]).toMatchObject({
      idJugador: PLAYER_ID,
      cotizacion: 83.75,
      tipoEstrategia: 'ataque_decisivo',
      idVersionEstrategia: STRATEGY_VERSION_ID,
      idRecalculo: RECALCULATION_ID,
      idEstadistica: STATS_ID,
    });
  });

  it('devuelve la página siguiente y usa valores por defecto', async () => {
    const secondPage = await request(integration.app.getHttpServer())
      .get(`/players/${PLAYER_ID}/quotes?page=2&limit=2`)
      .expect(200);
    expect(
      secondPage.body.items.map((item: { id: string }) => item.id),
    ).toEqual([QUOTE_IDS[0]]);

    const defaults = await request(integration.app.getHttpServer())
      .get(`/players/${PLAYER_ID}/quotes`)
      .expect(200);
    expect(defaults.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it('devuelve lista vacía para un jugador existente sin historial y 404 para uno inexistente', async () => {
    const empty = await request(integration.app.getHttpServer())
      .get(`/players/${EMPTY_PLAYER_ID}/quotes`)
      .expect(200);
    expect(empty.body).toMatchObject({ items: [], total: 0, totalPages: 0 });

    await request(integration.app.getHttpServer())
      .get('/players/00000000-0000-4000-8000-000000000000/quotes')
      .expect(404);
  });

  it('rechaza un UUID o parámetros de paginación inválidos con 422', async () => {
    await request(integration.app.getHttpServer())
      .get('/players/invalido/quotes')
      .expect(422);
    await request(integration.app.getHttpServer())
      .get(`/players/${PLAYER_ID}/quotes?page=0`)
      .expect(422);
    await request(integration.app.getHttpServer())
      .get(`/players/${PLAYER_ID}/quotes?limit=101`)
      .expect(422);
  });
});
