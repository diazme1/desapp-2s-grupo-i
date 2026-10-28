import { ExtendHistorialCotizacionForMarketOpening1790275839000 } from '../../../migrations/1790275839000-ExtendHistorialCotizacionForMarketOpening';
import { CreateSaldosUsuario1790275840000 } from '../../../migrations/1790275840000-CreateSaldosUsuario';
import { CreateTokens1790275841000 } from '../../../migrations/1790275841000-CreateTokens';
import { CreateTenenciasJugador1790275842000 } from '../../../migrations/1790275842000-CreateTenenciasJugador';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from '../players/players-integration-app';

describe('rollback de migraciones del mercado', () => {
  let integration: PlayersIntegrationApp;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({ obtenerCatalogo: jest.fn() });
  });

  afterAll(async () => integration?.close());

  it('revierte y vuelve a aplicar el bloque nuevo en orden inverso/directo', async () => {
    const runner = integration.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await new CreateTenenciasJugador1790275842000().down(runner);
      await new CreateTokens1790275841000().down(runner);
      await new CreateSaldosUsuario1790275840000().down(runner);
      await new ExtendHistorialCotizacionForMarketOpening1790275839000().down(runner);
      await new ExtendHistorialCotizacionForMarketOpening1790275839000().up(runner);
      await new CreateSaldosUsuario1790275840000().up(runner);
      await new CreateTokens1790275841000().up(runner);
      await new CreateTenenciasJugador1790275842000().up(runner);
    } finally {
      await runner.release();
    }
    const tables = await integration.dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('saldos_usuario', 'tokens', 'tenencias_jugador')
      ORDER BY table_name
    `);
    expect(tables.map((row: { table_name: string }) => row.table_name)).toEqual([
      'saldos_usuario',
      'tenencias_jugador',
      'tokens',
    ]);
  });
});
