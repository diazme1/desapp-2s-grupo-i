import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

const IDS = {
  admin: '30000000-0000-4000-8000-000000000001',
  user: '30000000-0000-4000-8000-000000000002',
};

describe('integridad persistente de saldos por rol', () => {
  let integration: OrdersIntegrationApp;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });

  beforeEach(async () => {
    await integration.resetData();
    await integration.dataSource.query(
      `INSERT INTO usuarios (id, correo, password_hash, rol)
       VALUES ($1, 'integrity-admin@example.com', 'hash', 'superadmin'),
              ($2, 'integrity-user@example.com', 'hash', 'usuario')`,
      [IDS.admin, IDS.user],
    );
    await integration.dataSource.query(
      `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
       VALUES ($1, 0), ($2, 0)`,
      [IDS.admin, IDS.user],
    );
  });

  afterAll(async () => integration?.close());

  it('permite saldo negativo al superadmin', async () => {
    await integration.dataSource.query(
      'UPDATE saldos_usuario SET creditos_disponibles = -2468 WHERE id_usuario = $1',
      [IDS.admin],
    );

    await expect(
      integration.dataSource.query(
        'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
        [IDS.admin],
      ),
    ).resolves.toEqual([{ creditos_disponibles: '-2468' }]);
  });

  it('rechaza con error de integridad el saldo negativo de un usuario común', async () => {
    await expect(
      integration.dataSource.query(
        'UPDATE saldos_usuario SET creditos_disponibles = -1 WHERE id_usuario = $1',
        [IDS.user],
      ),
    ).rejects.toMatchObject({ code: '23514' });

    await expect(
      integration.dataSource.query(
        'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
        [IDS.user],
      ),
    ).resolves.toEqual([{ creditos_disponibles: '0' }]);
  });

  it('también protege inserts negativos de usuarios comunes consultando el rol relacionado', async () => {
    await integration.dataSource.query(
      'DELETE FROM saldos_usuario WHERE id_usuario = $1',
      [IDS.user],
    );

    await expect(
      integration.dataSource.query(
        `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
         VALUES ($1, -1)`,
        [IDS.user],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
