import { formatDecimalUnits, parseDecimalUnits } from './creditos';

const MAX_NUMERIC_14_2 = 99_999_999_999_999n;

export class Cotizacion {
  static readonly APERTURA = Cotizacion.fromUnidades(100n);

  private constructor(private readonly unidades: bigint) {
    if (unidades < 0n) throw new Error('La cotización no puede ser negativa.');
    if (unidades > MAX_NUMERIC_14_2)
      throw new Error('La cotización excede numeric(14,2).');
  }

  static fromUnidades(unidades: bigint): Cotizacion {
    return new Cotizacion(unidades);
  }

  static fromDecimal(valor: string): Cotizacion {
    return new Cotizacion(parseDecimalUnits(valor, 'La cotización'));
  }

  toUnidades(): bigint {
    return this.unidades;
  }

  toDecimalString(): string {
    return formatDecimalUnits(this.unidades);
  }

  compareTo(otra: Cotizacion): number {
    return this.unidades < otra.unidades
      ? -1
      : this.unidades > otra.unidades
        ? 1
        : 0;
  }
}
