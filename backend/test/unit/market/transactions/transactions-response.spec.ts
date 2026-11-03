import { Creditos } from '../../../../src/market/domain/creditos';
import { Cotizacion } from '../../../../src/quotes/domain/cotizacion';
import {
  TransactionResponseDto,
  TransactionsResponseDto,
} from '../../../../src/market/transactions/dto/transactions-response.dto';
import type { PublicTransactionSnapshot } from '../../../../src/market/transactions/transactions.repository';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const PLAYER_ID = '10000000-0000-4000-8000-000000000002';

function operation(
  overrides: Partial<PublicTransactionSnapshot> = {},
): PublicTransactionSnapshot {
  return {
    idOperacion: '20000000-0000-4000-8000-000000000001',
    tipo: 'COMPRA',
    jugadorId: PLAYER_ID,
    nombreCompleto: 'Jugador de prueba completo',
    cantidadTokens: 2,
    cotizacion: Cotizacion.fromDecimal('15.25'),
    importeCreditos: 3050n,
    fechaHora: new Date('2026-10-31T12:00:00.000Z'),
    ...overrides,
  };
}

describe('proyección pública del historial de operaciones', () => {
  it('expone solo los campos públicos y conserva la precisión decimal', () => {
    const dto = TransactionResponseDto.from(operation());

    expect(Object.keys(dto).sort()).toEqual([
      'cantidadTokens',
      'cotizacion',
      'fechaHora',
      'idJugador',
      'idOperacion',
      'importe',
      'nombreCompleto',
      'tipo',
    ]);
    expect(dto).toEqual({
      idOperacion: '20000000-0000-4000-8000-000000000001',
      tipo: 'COMPRA',
      idJugador: PLAYER_ID,
      nombreCompleto: 'Jugador de prueba completo',
      cantidadTokens: 2,
      cotizacion: '15.25',
      importe: '30.50',
      fechaHora: new Date('2026-10-31T12:00:00.000Z'),
    });
    expect(dto.cotizacion).toBe(
      Cotizacion.fromUnidades(1525n).toDecimalString(),
    );
    expect(dto.importe).toBe(Creditos.fromUnidades(3050n).toDecimalString());
  });

  it('proyecta COMPRA y VENTA sin recalcular el importe', () => {
    const dto = TransactionsResponseDto.from(USER_ID, [
      operation({ tipo: 'COMPRA', cantidadTokens: 3, importeCreditos: 1n }),
      operation({
        idOperacion: '20000000-0000-4000-8000-000000000002',
        tipo: 'VENTA',
        cantidadTokens: 4,
        cotizacion: Cotizacion.fromDecimal('99.99'),
        importeCreditos: 7n,
        nombreCompleto: 'Jugador de prueba completo',
      }),
    ]);

    expect(dto.usuarioId).toBe(USER_ID);
    expect(dto.operaciones.map(({ tipo }) => tipo)).toEqual(['COMPRA', 'VENTA']);
    expect(dto.operaciones.map(({ importe }) => importe)).toEqual([
      '0.01',
      '0.07',
    ]);
  });

  it('conserva una lista vacía', () => {
    expect(TransactionsResponseDto.from(USER_ID, [])).toEqual({
      usuarioId: USER_ID,
      operaciones: [],
    });
  });
});
