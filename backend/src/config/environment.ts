export function validateEnvironment(config: Record<string, unknown>): {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_ALGORITHM?: string;
  FOOTBALL_DATA_API_URL?: string;
  FOOTBALL_DATA_API_TOKEN?: string;
  FOOTBALL_DATA_COMPETITIONS?: string;
  FOOTBALL_DATA_MAX_TEAMS?: number;
  FOOTBALL_DATA_REQUEST_DELAY_MS?: number;
} {
  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL es obligatoria y debe apuntar a PostgreSQL.');
  }

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

  const rawMaxTeams = config.FOOTBALL_DATA_MAX_TEAMS;
  const maxTeamsValue =
    typeof rawMaxTeams === 'string' && rawMaxTeams.trim() !== '' ? rawMaxTeams.trim() : undefined;
  let maxTeams: number | undefined;
  if (maxTeamsValue !== undefined) {
    if (!/^\d+$/.test(maxTeamsValue) || Number(maxTeamsValue) < 1) {
      throw new Error('FOOTBALL_DATA_MAX_TEAMS debe ser un entero positivo.');
    }
    maxTeams = Number(maxTeamsValue);
  }

  const rawRequestDelay = config.FOOTBALL_DATA_REQUEST_DELAY_MS;
  const requestDelayValue =
    typeof rawRequestDelay === 'string' && rawRequestDelay.trim() !== ''
      ? rawRequestDelay.trim()
      : undefined;
  let requestDelayMs: number | undefined;
  if (requestDelayValue !== undefined) {
    if (!/^\d+$/.test(requestDelayValue) || Number(requestDelayValue) < 0) {
      throw new Error('FOOTBALL_DATA_REQUEST_DELAY_MS debe ser un entero mayor o igual a cero.');
    }
    requestDelayMs = Number(requestDelayValue);
  }

  return {
    PORT: port,
    DATABASE_URL: databaseUrl,
    ...(typeof jwtSecret === 'string' && { JWT_SECRET: jwtSecret }),
    JWT_EXPIRES_IN: typeof jwtExpiresIn === 'string' ? jwtExpiresIn : '15m',
    JWT_ALGORITHM: typeof algorithm === 'string' ? algorithm : 'HS256',
    ...(typeof config.FOOTBALL_DATA_API_URL === 'string' && {
      FOOTBALL_DATA_API_URL: config.FOOTBALL_DATA_API_URL,
    }),
    ...(typeof config.FOOTBALL_DATA_API_TOKEN === 'string' && {
      FOOTBALL_DATA_API_TOKEN: config.FOOTBALL_DATA_API_TOKEN,
    }),
    ...(typeof config.FOOTBALL_DATA_COMPETITIONS === 'string' && {
      FOOTBALL_DATA_COMPETITIONS: config.FOOTBALL_DATA_COMPETITIONS,
    }),
    ...(maxTeams !== undefined && { FOOTBALL_DATA_MAX_TEAMS: maxTeams }),
    ...(requestDelayMs !== undefined && { FOOTBALL_DATA_REQUEST_DELAY_MS: requestDelayMs }),
  };
}
