import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const envPath = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
].find((candidate) => existsSync(candidate));

if (envPath) config({ path: envPath, quiet: true });
