import type { WhoScoredLookupPort } from '../../../../src/players/estadisticas-jugador.service';
import type {
  WhoScoredLookupInput,
  WhoScoredLookupResult,
  WhoScoredOperationContext,
} from '../../../../src/players/adapters/whoscored/whoscored.types';

export class FakeWhoScoredAdapter implements WhoScoredLookupPort {
  ultimaEntrada?: WhoScoredLookupInput;
  respuesta: WhoScoredLookupResult = {
    estado: 'exito_completo',
    identidad: {
      playerIdExterno: 'ws-1',
      nombre: 'Jugador Uno',
      equipo: 'Equipo Uno',
      liga: 'Liga Uno',
    },
    metricas: {
      goles: 1,
      asistencias: 2,
      tiros: 3,
      pasesClave: 4,
      regates: 5,
      entradas: 6,
      ratingWhoScored: 7.1,
    },
  };
  promesaPendiente = false;
  abortoRecibido = false;

  async obtenerEstadisticas(
    input: WhoScoredLookupInput,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredLookupResult> {
    this.ultimaEntrada = input;
    if (this.promesaPendiente) {
      return new Promise<WhoScoredLookupResult>((_resolve, reject) => {
        const abortar = () => {
          this.abortoRecibido = true;
          reject(new Error('Operacion abortada por deadline.'));
        };
        if (context.signal.aborted) abortar();
        else context.signal.addEventListener('abort', abortar, { once: true });
      });
    }
    return this.respuesta;
  }
}
