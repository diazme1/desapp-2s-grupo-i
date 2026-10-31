import request from 'supertest';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../src/users/domain/user';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

describe('POST /orders/buy - Idempotency-Key', () => {
  let integration: OrdersIntegrationApp;
  let token: string;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
    token = integration.app.get(JwtTokenService).sign({
      sub: '00000000-0000-4000-8000-000000000002',
      correo: 'buyer@example.com',
      rol: UserRole.USER,
    });
  });

  beforeEach(async () => integration.resetData());
  afterAll(async () => integration?.close());

  it.each([
    ['ausente', undefined],
    ['vacío', ''],
    ['solo espacios', '   '],
    ['espacios internos', 'buy key'],
    ['carácter inválido', 'buy/key'],
    ['más de 128 caracteres', 'a'.repeat(129)],
  ])('rechaza header %s con 422 y sin efectos', async (_name, value) => {
    const before = await counts(integration);
    const http = request(integration.app.getHttpServer())
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idJugador: '00000000-0000-4000-8000-000000000003',
        cantidadTokens: 1,
      });
    if (value !== undefined) http.set('Idempotency-Key', value);
    await http.expect(422);
    expect(await counts(integration)).toEqual(before);
  });
});

async function counts(integration: OrdersIntegrationApp) {
  const tables = [
    'tokens',
    'tenencias_jugador',
    'saldos_usuario',
    'transacciones_mercado',
    'auditorias_transaccion',
  ];
  const result: Record<string, number> = {};
  for (const table of tables) {
    const rows = await integration.dataSource.query(
      `SELECT count(*)::int AS count FROM ${table}`,
    );
    result[table] = rows[0].count;
  }
  return result;
}
