import { NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { PortfolioService } from '../../../../src/market/orders/portfolio.service';

type MockManager = { query: jest.Mock };

interface PortfolioRows {
  users?: Array<{ id: string }>;
  balances?: Array<{ creditosDisponibles: string }>;
  positions?: Array<Record<string, unknown>>;
  operations?: Array<Record<string, unknown>>;
  movements?: Array<Record<string, unknown>>;
}

function createSubject() {
  const manager: MockManager = { query: jest.fn() };
  const transaction = jest.fn(
    async (_isolation: unknown, work: (manager: MockManager) => unknown) =>
      work(manager),
  );
  const service = new PortfolioService({
    transaction,
  } as unknown as DataSource);

  function mockQueries(rows: PortfolioRows = {}) {
    [
      rows.users ?? [{ id: 'user-1' }],
      rows.balances ?? [],
      rows.positions ?? [],
      rows.operations ?? [],
      rows.movements ?? [],
    ].forEach((result) => manager.query.mockResolvedValueOnce(result));
  }

  return { manager, transaction, service, mockQueries };
}

describe('PortfolioService', () => {
  it('consulta dentro de una transacción consistente y rechaza usuarios inexistentes', async () => {
    const subject = createSubject();
    subject.mockQueries({ users: [] });

    await expect(
      subject.service.obtener('missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(subject.transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(subject.manager.query).toHaveBeenCalledTimes(1);
  });

  it('devuelve ceros y listas vacías cuando no hay saldo, posiciones ni operaciones', async () => {
    const subject = createSubject();
    subject.mockQueries();

    await expect(subject.service.obtener('user-1')).resolves.toEqual({
      creditosDisponibles: '0.00',
      valorTotal: '0.00',
      gananciaPerdidaTotal: '0.00',
      posiciones: [],
      operacionesRecientes: [],
    });
    expect(subject.manager.query).toHaveBeenCalledTimes(5);
  });

  it('calcula posiciones, ventas parciales, operaciones y excluye costos desconocidos del resultado', async () => {
    const subject = createSubject();
    const fechaCotizacion = new Date('2026-10-31T12:00:00.000Z');
    const fechaOperacion = new Date('2026-10-31T13:00:00.000Z');
    subject.mockQueries({
      balances: [{ creditosDisponibles: '12345' }],
      positions: [
        {
          idJugador: 'player-positive',
          nombre: 'Jugador positivo',
          equipo: 'Equipo A',
          liga: 'PL',
          cantidadTokens: 1,
          cotizacion: '15.00',
          fechaCotizacion,
        },
        {
          idJugador: 'player-negative',
          nombre: 'Jugador negativo',
          equipo: 'Equipo B',
          liga: 'LL',
          cantidadTokens: 1,
          cotizacion: '8.00',
          fechaCotizacion,
        },
        {
          idJugador: 'player-no-quote',
          nombre: 'Sin cotización',
          equipo: 'Equipo C',
          liga: 'SA',
          cantidadTokens: 1,
          cotizacion: null,
          fechaCotizacion: null,
        },
        {
          idJugador: 'player-no-cost',
          nombre: 'Sin costo conocido',
          equipo: 'Equipo D',
          liga: 'BL',
          cantidadTokens: 1,
          cotizacion: '7.50',
          fechaCotizacion,
        },
        {
          idJugador: 'player-rebought',
          nombre: 'Jugador recomprado',
          equipo: 'Equipo E',
          liga: 'L1',
          cantidadTokens: 1,
          cotizacion: '15.00',
          fechaCotizacion,
        },
        {
          idJugador: 'player-no-history',
          nombre: 'Sin historial de compra',
          equipo: 'Equipo F',
          liga: 'L2',
          cantidadTokens: 1,
          cotizacion: '4.25',
          fechaCotizacion,
        },
      ],
      operations: [
        {
          idOperacion: 'operation-1',
          tipo: 'venta',
          idJugador: 'player-positive',
          jugador: 'Jugador positivo',
          cantidadTokens: 1,
          cotizacion: '9.5',
          importe: '950',
          fechaHora: fechaOperacion,
        },
        {
          idOperacion: 'operation-2',
          tipo: 'compra',
          idJugador: 'player-negative',
          jugador: 'Jugador negativo',
          cantidadTokens: 1,
          cotizacion: '10.00',
          importe: '1000',
          fechaHora: fechaOperacion,
        },
      ],
      movements: [
        {
          idJugador: 'player-positive',
          cantidad: 2,
          importe: '2000',
          tipo: 'compra',
        },
        {
          idJugador: 'player-positive',
          cantidad: 1,
          importe: '1000',
          tipo: 'venta',
        },
        {
          idJugador: 'player-negative',
          cantidad: 2,
          importe: '2000',
          tipo: 'compra',
        },
        {
          idJugador: 'player-negative',
          cantidad: 1,
          importe: '1000',
          tipo: 'venta',
        },
        // La venta supera la posición restante, por lo que el costo no se altera.
        {
          idJugador: 'player-negative',
          cantidad: 2,
          importe: '2000',
          tipo: 'venta',
        },
        // Sin compras anteriores, esta venta no crea un costo promedio.
        {
          idJugador: 'player-no-cost',
          cantidad: 1,
          importe: '750',
          tipo: 'venta',
        },
        {
          idJugador: 'player-rebought',
          cantidad: 1,
          importe: '1000',
          tipo: 'compra',
        },
        {
          idJugador: 'player-rebought',
          cantidad: 1,
          importe: '1000',
          tipo: 'venta',
        },
        {
          idJugador: 'player-rebought',
          cantidad: 1,
          importe: '1300',
          tipo: 'compra',
        },
      ],
    });

    const result = await subject.service.obtener('user-1');

    expect(result).toEqual({
      creditosDisponibles: '123.45',
      valorTotal: '49.75',
      gananciaPerdidaTotal: '5.00',
      posiciones: [
        {
          idJugador: 'player-positive',
          jugador: 'Jugador positivo',
          equipo: 'Equipo A',
          liga: 'PL',
          cantidadTokens: 1,
          cotizacion: '15.00',
          fechaCotizacion,
          precioPromedioCompra: '10.00',
          valorActual: '15.00',
          gananciaPerdida: '5.00',
        },
        {
          idJugador: 'player-negative',
          jugador: 'Jugador negativo',
          equipo: 'Equipo B',
          liga: 'LL',
          cantidadTokens: 1,
          cotizacion: '8.00',
          fechaCotizacion,
          precioPromedioCompra: '10.00',
          valorActual: '8.00',
          gananciaPerdida: '-2.00',
        },
        {
          idJugador: 'player-no-quote',
          jugador: 'Sin cotización',
          equipo: 'Equipo C',
          liga: 'SA',
          cantidadTokens: 1,
          cotizacion: null,
          fechaCotizacion: null,
          precioPromedioCompra: null,
          valorActual: null,
          gananciaPerdida: null,
        },
        {
          idJugador: 'player-no-cost',
          jugador: 'Sin costo conocido',
          equipo: 'Equipo D',
          liga: 'BL',
          cantidadTokens: 1,
          cotizacion: '7.50',
          fechaCotizacion,
          precioPromedioCompra: null,
          valorActual: '7.50',
          gananciaPerdida: null,
        },
        {
          idJugador: 'player-rebought',
          jugador: 'Jugador recomprado',
          equipo: 'Equipo E',
          liga: 'L1',
          cantidadTokens: 1,
          cotizacion: '15.00',
          fechaCotizacion,
          precioPromedioCompra: '13.00',
          valorActual: '15.00',
          gananciaPerdida: '2.00',
        },
        {
          idJugador: 'player-no-history',
          jugador: 'Sin historial de compra',
          equipo: 'Equipo F',
          liga: 'L2',
          cantidadTokens: 1,
          cotizacion: '4.25',
          fechaCotizacion,
          precioPromedioCompra: null,
          valorActual: '4.25',
          gananciaPerdida: null,
        },
      ],
      operacionesRecientes: [
        {
          idOperacion: 'operation-1',
          tipo: 'venta',
          idJugador: 'player-positive',
          jugador: 'Jugador positivo',
          cantidadTokens: 1,
          cotizacion: '9.50',
          importe: '9.50',
          fechaHora: fechaOperacion,
        },
        {
          idOperacion: 'operation-2',
          tipo: 'compra',
          idJugador: 'player-negative',
          jugador: 'Jugador negativo',
          cantidadTokens: 1,
          cotizacion: '10.00',
          importe: '10.00',
          fechaHora: fechaOperacion,
        },
      ],
    });
  });
});
