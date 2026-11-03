export const ESTADISTICAS_PREDICHAS = [
  'goles',
  'asistencias',
  'tiros',
  'pasesClave',
  'regates',
  'faltasCometidas',
  'rating',
] as const;

export type EstadisticaPredichaNombre = (typeof ESTADISTICAS_PREDICHAS)[number];
export type EstadisticasPredichas = Record<EstadisticaPredichaNombre, string>;

const ESCALAS: Record<EstadisticaPredichaNombre, number> = {
  goles: 0,
  asistencias: 0,
  tiros: 3,
  pasesClave: 3,
  regates: 3,
  faltasCometidas: 3,
  rating: 3,
};

function decimal(value: unknown, scale: number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error('La estadistica predicha no es numerica.');
  const nonNegative = Math.max(0, numeric);
  if (scale === 0) return String(Math.floor(nonNegative + 0.5));
  return nonNegative.toFixed(scale);
}

export function normalizarEstadisticasPredichas(input: Partial<Record<EstadisticaPredichaNombre, unknown>>): EstadisticasPredichas {
  return Object.fromEntries(
    ESTADISTICAS_PREDICHAS.map((name) => [name, decimal(input[name] ?? 0, ESCALAS[name])]),
  ) as EstadisticasPredichas;
}

export function escalaDeEstadistica(name: EstadisticaPredichaNombre): number {
  return ESCALAS[name];
}
