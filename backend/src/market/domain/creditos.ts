export class Creditos {
  static readonly ESCALA = 2;
  static readonly UNIDADES_POR_CREDITO = 100n;

  private constructor(private readonly unidades: bigint) {
    if (unidades < 0n) throw new Error('Los créditos no pueden ser negativos.');
  }

  static fromUnidades(unidades: bigint): Creditos {
    return new Creditos(unidades);
  }

  static fromDecimal(valor: string): Creditos {
    return new Creditos(parseDecimalUnits(valor, 'créditos'));
  }

  static inicial(): Creditos {
    return Creditos.fromUnidades(100_000n);
  }

  toUnidades(): bigint {
    return this.unidades;
  }

  toDecimalString(): string {
    return formatDecimalUnits(this.unidades);
  }

  sumar(otro: Creditos): Creditos {
    return new Creditos(this.unidades + otro.unidades);
  }

  restar(otro: Creditos): Creditos {
    if (otro.unidades > this.unidades)
      throw new Error('El saldo no puede quedar negativo.');
    return new Creditos(this.unidades - otro.unidades);
  }

  compareTo(otro: Creditos): number {
    return this.unidades < otro.unidades
      ? -1
      : this.unidades > otro.unidades
        ? 1
        : 0;
  }
}

export function parseDecimalUnits(valor: string, nombre: string): bigint {
  if (typeof valor !== 'string' || valor.trim() !== valor || valor === '')
    throw new Error(`${nombre} debe ser un decimal explícito.`);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!match) throw new Error(`${nombre} debe tener como máximo dos decimales.`);
  const parteDecimal = (match[2] ?? '').padEnd(2, '0');
  return BigInt(match[1]) * 100n + BigInt(parteDecimal || '0');
}

export function formatDecimalUnits(unidades: bigint): string {
  if (unidades < 0n) throw new Error('El valor no puede ser negativo.');
  const enteros = unidades / 100n;
  const decimales = (unidades % 100n).toString().padStart(2, '0');
  return `${enteros.toString()}.${decimales}`;
}
