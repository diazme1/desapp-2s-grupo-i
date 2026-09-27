import { ConfigService } from '@nestjs/config';
import {
  FootballDataAdapter,
  FootballDataError,
} from '../../../src/players/adapters/football-data/football-data.adapter';

describe('FootballDataAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('traduce una competencia, su equipo y su plantilla al catálogo local', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            competition: { id: 2021, code: 'PL', name: 'Premier League', area: { name: 'England' } },
            teams: [{ id: 65, name: 'Manchester City FC', shortName: 'Man City', tla: 'MCI' }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 65,
            name: 'Manchester City FC',
            shortName: 'Man City',
            tla: 'MCI',
            squad: [
              {
                id: 44,
                name: 'Cristiano Ronaldo',
                position: 'Attacker',
                dateOfBirth: '1985-02-05',
                nationality: 'Portugal',
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const adapter = new FootballDataAdapter(
      new ConfigService({
        FOOTBALL_DATA_API_URL: 'https://football-data.test/v4',
        FOOTBALL_DATA_API_TOKEN: 'secret-token',
        FOOTBALL_DATA_COMPETITIONS: 'PL',
      }),
    );

    const catalogo = await adapter.obtenerCatalogo();

    expect(catalogo.ligas).toHaveLength(1);
    expect(catalogo.equipos).toHaveLength(1);
    expect(catalogo.jugadores[0]).toMatchObject({
      proveedorId: 44,
      nombre: 'Cristiano Ronaldo',
      fechaNacimiento: '1985-02-05',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { 'X-Auth-Token': 'secret-token' },
    });
  });

  it('rechaza una respuesta no exitosa del proveedor', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 429 }));
    const adapter = new FootballDataAdapter(
      new ConfigService({ FOOTBALL_DATA_API_TOKEN: 'secret-token', FOOTBALL_DATA_COMPETITIONS: 'PL' }),
    );

    await expect(adapter.obtenerCatalogo()).rejects.toBeInstanceOf(FootballDataError);
  });

  it('no intenta consultar la fuente sin token configurado', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const adapter = new FootballDataAdapter(new ConfigService({ FOOTBALL_DATA_COMPETITIONS: 'PL' }));

    await expect(adapter.obtenerCatalogo()).rejects.toThrow('FOOTBALL_DATA_API_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
