import { WhoScoredAdapter } from '../../../src/players/adapters/whoscored/whoscored.adapter';
import type {
  WhoScoredHttpResponse,
  WhoScoredTransport,
} from '../../../src/players/adapters/whoscored/whoscored.types';

class FailingTransport implements WhoScoredTransport {
  constructor(private readonly behavior: 'network' | 'timeout' | 'http') {}

  async get(_url: string, _signal: AbortSignal): Promise<WhoScoredHttpResponse> {
    if (this.behavior === 'network') throw new Error('DNS no disponible');
    if (this.behavior === 'timeout') return new Promise<WhoScoredHttpResponse>(() => undefined);
    return { status: 503, body: '' };
  }
}

const input = { nombreJugador: 'Jugador', equipoJugador: 'Equipo', ligaEquipoJugador: 'Liga' };
const context = () => ({ signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 });

describe('fallas de WhoScoredAdapter', () => {
  it.each(['network', 'http'] as const)('clasifica %s como fuente no disponible', async (behavior) => {
    const adapter = new WhoScoredAdapter(new FailingTransport(behavior), 'https://example.test', 10);

    const result = await adapter.obtenerEstadisticas(input, context());

    expect(result.estado).toBe('fuente_no_disponible');
  });

  it('termina un timeout individual sin esperar indefinidamente', async () => {
    const adapter = new WhoScoredAdapter(new FailingTransport('timeout'), 'https://example.test', 5);

    await expect(adapter.obtenerEstadisticas(input, context())).resolves.toMatchObject({
      estado: 'fuente_no_disponible',
    });
  });
});
