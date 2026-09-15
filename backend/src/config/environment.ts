export function validateEnvironment(config: Record<string, unknown>): {
  PORT: number;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_ALGORITHM?: string;
} {
  const raw = config.PORT;
  let port = 3000;
  if (raw !== undefined) {
    if (typeof raw !== 'string' || !/^[0-9]+$/.test(raw)) {
      throw new Error('PORT debe ser un entero entre 1 y 65535.');
    }
    port = Number(raw);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }

  const jwtSecret = config.JWT_SECRET;
  const isTest = process.env.NODE_ENV === 'test';
  if (!isTest && (typeof jwtSecret !== 'string' || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  const jwtExpiresIn = config.JWT_EXPIRES_IN;
  if (
    jwtExpiresIn !== undefined &&
    (typeof jwtExpiresIn !== 'string' || !/^\d+(s|m|h|d)$/.test(jwtExpiresIn))
  ) {
    throw new Error('JWT_EXPIRES_IN debe usar un formato como 15m, 1h o 1d.');
  }

  const algorithm = config.JWT_ALGORITHM;
  if (algorithm !== undefined && !['HS256', 'HS384', 'HS512'].includes(String(algorithm))) {
    throw new Error('JWT_ALGORITHM debe ser HS256, HS384 o HS512.');
  }

  return {
    PORT: port,
    ...(typeof config.DATABASE_URL === 'string' && {
      DATABASE_URL: config.DATABASE_URL,
    }),
    ...(typeof jwtSecret === 'string' && { JWT_SECRET: jwtSecret }),
    JWT_EXPIRES_IN: typeof jwtExpiresIn === 'string' ? jwtExpiresIn : '15m',
    JWT_ALGORITHM: typeof algorithm === 'string' ? algorithm : 'HS256',
  };
}
