import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from '../../../src/orders/orders.repository';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

describe('persistencia transaccional de órdenes', () => {
  let integration: OrdersIntegrationApp;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });
  beforeEach(async () => integration.resetData());
  afterAll(async () => integration?.close());

  it('carga ausencias sin decidir reglas de viabilidad', async () => {
    const repository = integration.app.get<OrdersRepository>(ORDERS_REPOSITORY);
    const context = await repository.enTransaccion((unitOfWork) =>
      unitOfWork.bloquearYcargarCompra({
        compradorId: '00000000-0000-4000-8000-000000000001',
        vendedorEmail: 'admin@example.com',
        jugadorId: '00000000-0000-4000-8000-000000000002',
        claveIdempotencia: 'repository-absence',
      }),
    );

    expect(context.comprador).toBeNull();
    expect(context.vendedor).toBeNull();
    expect(context.jugador).toBeNull();
    expect(context.quote).toBeNull();
    expect(context.saldoComprador).toBeNull();
    expect(context.tokensJugador).toEqual([]);
    expect(context.ordenExistente).toBeNull();
  });

  it('mantiene las tablas de órdenes sin escrituras si no se persiste un resultado', async () => {
    const rows = await integration.dataSource.query(
      `SELECT count(*)::int AS orders FROM transacciones_mercado
       CROSS JOIN (SELECT count(*) FROM auditorias_transaccion) auditorias`,
    );
    expect(rows[0].orders).toBe(0);
  });
});
