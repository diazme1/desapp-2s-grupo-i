import { Creditos } from '../../market/domain/creditos';

export class SaldoExacto {
  private constructor(private readonly unidades: bigint) {}

  static fromUnidades(unidades: bigint): SaldoExacto {
    return new SaldoExacto(unidades);
  }

  static fromDecimal(valor: string): SaldoExacto {
    if (typeof valor !== 'string' || valor.trim() !== valor || valor === '')
      throw new Error('El saldo debe ser un decimal explícito.');
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
    if (!match)
      throw new Error('El saldo debe tener como máximo dos decimales.');
    const parteDecimal = (match[3] ?? '').padEnd(2, '0');
    const unidades = BigInt(match[2]) * 100n + BigInt(parteDecimal || '0');
    return new SaldoExacto(match[1] === '-' ? -unidades : unidades);
  }

  static fromCreditos(creditos: Creditos): SaldoExacto {
    return SaldoExacto.fromUnidades(creditos.toUnidades());
  }

  toUnidades(): bigint {
    return this.unidades;
  }

  toDecimalString(): string {
    const negativo = this.unidades < 0n;
    const absolutas = negativo ? -this.unidades : this.unidades;
    const enteros = absolutas / 100n;
    const decimales = (absolutas % 100n).toString().padStart(2, '0');
    return `${negativo ? '-' : ''}${enteros.toString()}.${decimales}`;
  }

  sumar(importe: Creditos | SaldoExacto): SaldoExacto {
    return new SaldoExacto(this.unidades + unidadesDe(importe));
  }

  restar(importe: Creditos | SaldoExacto): SaldoExacto {
    return new SaldoExacto(this.unidades - unidadesDe(importe));
  }

  compareTo(importe: Creditos | SaldoExacto): number {
    const otrasUnidades = unidadesDe(importe);
    return this.unidades < otrasUnidades
      ? -1
      : this.unidades > otrasUnidades
        ? 1
        : 0;
  }
}

function unidadesDe(importe: Creditos | SaldoExacto): bigint {
  return importe.toUnidades();
}
