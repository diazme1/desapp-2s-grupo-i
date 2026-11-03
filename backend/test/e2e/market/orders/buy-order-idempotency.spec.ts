import request from 'supertest';
import { JwtTokenService } from '../../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../../src/users/domain/user';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from './orders-e2e-app';

describe('POST /orders/buy - Idempotency-Key', () => {
  let e2e: OrdersE2eApp;
  let token: string;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
    token = e2e.app.get(JwtTokenService).sign({
      sub: '00000000-0000-4000-8000-000000000002',
      correo: 'buyer@example.com',
      rol: UserRole.USER,
    });
  });

  beforeEach(async () => e2e.resetData());
  afterAll(async () => e2e?.close());

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
    ['espacios internos', 'buy key'],
    ['carácter inválido', 'buy/key'],
    ['más de 128 caracteres', 'a'.repeat(129)],
  ])('rechaza header %s con 422 y sin efectos', async (_name, value) => {
    const before = await counts(e2e);
    const http = request(e2e.app.getHttpServer())
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idJugador: '00000000-0000-4000-8000-000000000003',
        cantidadTokens: 1,
      });
    if (value !== undefined) http.set('Idempotency-Key', value);
    await http.expect(422);
    expect(await counts(e2e)).toEqual(before);
  });
});

async function counts(e2e: OrdersE2eApp) {
  const tables = [
    'tokens',
    'tenencias_jugador',
    'saldos_usuario',
    'transacciones_mercado',
    'auditorias_transaccion',
  ];
  const result: Record<string, number> = {};
  for (const table of tables) {
    const rows = await e2e.dataSource.query(
      `SELECT count(*)::int AS count FROM ${table}`,
    );
    result[table] = rows[0].count;
  }
  return result;
}
