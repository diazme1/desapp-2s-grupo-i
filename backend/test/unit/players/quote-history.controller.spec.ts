import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayersController } from '../../../src/players/players.controller';
import { HistorialCotizacionService } from '../../../src/quotes/historial-cotizacion.service';
import { ListarCotizacionesDto } from '../../../src/quotes/dto/listar-cotizaciones.dto';

const PLAYER_ID = 'd4fd866a-1c58-4423-99eb-56e70a054bb4';
const QUOTE_ID = '9948e5b3-35fa-4104-baf4-93d593fa9a03';

describe('GET /players/:id/quotes', () => {
  const historialCotizacion = {
    listar: jest.fn().mockResolvedValue({
      items: [
        {
          id: QUOTE_ID,
          jugadorId: PLAYER_ID,
          fechaHora: new Date('2026-03-01T00:00:00.000Z'),
          cotizacion: 83.75,
          tipoEstrategia: 'ataque_decisivo',
          idVersionEstrategia: '3b8c2818-ce16-44c2-9c83-22270d745f04',
          idRecalculo: 'c9913672-bf68-49ca-9b0a-521f6f6d8ea4',
          idEstadistica: '150b06ef-c482-4584-b4be-17b455b686bd',
        },
      ],
      page: 2,
      limit: 7,
      total: 8,
      totalPages: 2,
    }),
  };
  const controller = new PlayersController(
    {} as any,
    {} as any,
    historialCotizacion as unknown as HistorialCotizacionService,
  );

  beforeEach(() => historialCotizacion.listar.mockClear());

  it('está montado como GET en la ruta de historial y devuelve la página pedida', async () => {
    const handler = PlayersController.prototype.listarCotizaciones;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'players/:id/quotes',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );

    const response = await controller.listarCotizaciones(PLAYER_ID, {
      page: 2,
      limit: 7,
    });

    expect(historialCotizacion.listar).toHaveBeenCalledWith(PLAYER_ID, {
      page: 2,
      limit: 7,
    });
    expect(response).toMatchObject({
      page: 2,
      limit: 7,
      total: 8,
      totalPages: 2,
    });
    expect(response.items[0]).toMatchObject({
      id: QUOTE_ID,
      idJugador: PLAYER_ID,
      cotizacion: 83.75,
      tipoEstrategia: 'ataque_decisivo',
    });
  });

  it('convierte y valida los parámetros de paginación', async () => {
    const defaults = plainToInstance(ListarCotizacionesDto, {});
    expect(defaults).toMatchObject({ page: 1, limit: 20 });
    expect(await validate(defaults)).toHaveLength(0);

    const valid = plainToInstance(ListarCotizacionesDto, {
      page: '2',
      limit: '7',
    });
    expect(valid).toMatchObject({ page: 2, limit: 7 });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(ListarCotizacionesDto, {
      page: '0',
      limit: '101',
    });
    expect(await validate(invalid)).not.toHaveLength(0);
  });
});
