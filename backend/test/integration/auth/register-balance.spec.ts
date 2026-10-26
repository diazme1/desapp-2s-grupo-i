import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  createIntegrationApp,
  IntegrationApp,
} from '../helpers/integration-app';

describe('POST /auth/register y saldo inicial', () => {
  let app: INestApplication;
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });

  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('mantiene el contrato HTTP y crea exactamente un saldo de 1.000,00', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'balance@example.com', password: 'secret123' })
      .expect(201);

    const rows = await integration.dataSource.query(
      'SELECT id_usuario, creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
      [response.body.id],
    );
    expect(rows).toEqual([{ id_usuario: response.body.id, creditos_disponibles: '100000' }]);
  });

  it('deja una sola cuenta y un solo saldo ante registros concurrentes del mismo correo', async () => {
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({ correo: 'race@example.com', password: 'secret123' }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const rows = await integration.dataSource.query(
      'SELECT u.id, s.creditos_disponibles FROM usuarios u JOIN saldos_usuario s ON s.id_usuario = u.id WHERE u.correo = $1',
      ['race@example.com'],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].creditos_disponibles).toBe('100000');
  });
});
