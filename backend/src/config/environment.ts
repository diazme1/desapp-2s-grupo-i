export function validateEnvironment(config: Record<string, unknown>): {
  PORT: number;
} {
  const raw = config.PORT;
  if (raw === undefined) return { PORT: 3000 };
  if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  return { PORT: port };
}
