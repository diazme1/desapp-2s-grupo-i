export const TIPOS_ESTRATEGIA_COTIZACION = {
  ATAQUE_DECISIVO: 'ataque_decisivo',
  CREACION_TECNICA: 'creacion_tecnica',
} as const;

export type TipoEstrategiaCotizacion =
  (typeof TIPOS_ESTRATEGIA_COTIZACION)[keyof typeof TIPOS_ESTRATEGIA_COTIZACION];

export interface PesosEstrategiaCotizacion {
  goles: number;
  asistencias: number;
  tiros: number;
  pasesClave: number;
  regates: number;
  rating: number;
  faltasCometidas: number;
}

export type EstadisticasParaCotizacion = {
  goles: number | null;
  asistencias: number | null;
  tiros: number | null;
  pasesClave: number | null;
  regates: number | null;
  ratingWhoScored: number | null;
  faltasCometidas: number | null;
};

export interface VersionEstrategiaCotizacion {
  id: string;
  tipoEstrategia: TipoEstrategiaCotizacion;
  numeroVersion: number;
  pesos: PesosEstrategiaCotizacion;
}

const PESOS_V1: Record<TipoEstrategiaCotizacion, PesosEstrategiaCotizacion> = {
  ataque_decisivo: {
    goles: 35,
    asistencias: 25,
    tiros: 20,
    pasesClave: 5,
    regates: 5,
    rating: 5,
    faltasCometidas: 5,
  },
  creacion_tecnica: {
    goles: 5,
    asistencias: 15,
    tiros: 5,
    pasesClave: 30,
    regates: 25,
    rating: 15,
    faltasCometidas: 5,
  },
};

const MAX_COTIZACION_EN_CENTAVOS = 99_999_999_999_999n;

export class EstrategiaCotizacion {
  readonly pesos: Readonly<PesosEstrategiaCotizacion>;

  private constructor(
    readonly tipo: TipoEstrategiaCotizacion,
    readonly numeroVersion: number,
    pesos: PesosEstrategiaCotizacion,
  ) {
    validarPesos(pesos);
    if (!Number.isInteger(numeroVersion) || numeroVersion < 1) {
      throw new Error('La versión de estrategia debe ser un entero positivo.');
    }
    this.pesos = Object.freeze({ ...pesos });
  }

  static versionInicial(tipo: TipoEstrategiaCotizacion): EstrategiaCotizacion {
    return new EstrategiaCotizacion(tipo, 1, PESOS_V1[tipo]);
  }

  static desdeVersion(version: VersionEstrategiaCotizacion): EstrategiaCotizacion {
    return new EstrategiaCotizacion(
      version.tipoEstrategia,
      version.numeroVersion,
      version.pesos,
    );
  }

  calcular(estadisticas: EstadisticasParaCotizacion): string {
    const metricas = [
      { valor: estadisticas.goles, peso: this.pesos.goles, signo: 1n },
      { valor: estadisticas.asistencias, peso: this.pesos.asistencias, signo: 1n },
      { valor: estadisticas.tiros, peso: this.pesos.tiros, signo: 1n },
      { valor: estadisticas.pasesClave, peso: this.pesos.pasesClave, signo: 1n },
      { valor: estadisticas.regates, peso: this.pesos.regates, signo: 1n },
      { valor: estadisticas.ratingWhoScored, peso: this.pesos.rating, signo: 1n },
      {
        valor: estadisticas.faltasCometidas,
        peso: this.pesos.faltasCometidas,
        signo: -1n,
      },
    ].map((metrica) => ({ ...metrica, decimal: aDecimal(metrica.valor) }));

    const escalaComun = metricas.reduce(
      (maxima, metrica) => Math.max(maxima, metrica.decimal.escala),
      0,
    );
    const denominador = 10n ** BigInt(escalaComun);
    let numeradorCentavos = 100n * denominador;

    for (const metrica of metricas) {
      const escala = 10n ** BigInt(escalaComun - metrica.decimal.escala);
      numeradorCentavos +=
        metrica.decimal.coeficiente *
        escala *
        BigInt(metrica.peso) *
        metrica.signo;
    }

    if (numeradorCentavos <= 0n) return '0.00';
    const centavos = (numeradorCentavos + denominador / 2n) / denominador;
    if (centavos > MAX_COTIZACION_EN_CENTAVOS) {
      throw new RangeError('La cotización supera la precisión permitida.');
    }
    return `${centavos / 100n}.${(centavos % 100n).toString().padStart(2, '0')}`;
  }
}

function validarPesos(pesos: PesosEstrategiaCotizacion): void {
  const valores = Object.values(pesos);
  if (
    valores.length !== 7 ||
    valores.some((valor) => !Number.isInteger(valor) || valor < 0 || valor > 100) ||
    valores.reduce((total, valor) => total + valor, 0) !== 100
  ) {
    throw new Error('Los pesos de la estrategia deben ser enteros que sumen 100.');
  }
}

function aDecimal(valor: number | null): { coeficiente: bigint; escala: number } {
  if (valor === null) return { coeficiente: 0n, escala: 0 };
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error('Las métricas usadas para cotizar deben ser finitas y no negativas.');
  }

  const [mantisa, exponenteTexto] = valor.toString().toLowerCase().split('e');
  const exponente = exponenteTexto ? Number(exponenteTexto) : 0;
  const [entero, fraccion = ''] = mantisa.split('.');
  let coeficiente = BigInt(`${entero}${fraccion}`);
  let escala = fraccion.length - exponente;
  if (escala < 0) {
    coeficiente *= 10n ** BigInt(-escala);
    escala = 0;
  }
  return { coeficiente, escala };
}
