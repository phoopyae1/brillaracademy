import { Pool } from 'pg';

let pool: Pool | null = null;
const LOCAL_FALLBACK_DATABASE_URL = 'postgres://postgres:password@localhost:5433/brillaracademy';

export function getPool(): Pool | null {
  if (pool) {
    return pool;
  }

  let connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn(
      '[DB] DATABASE_URL is not set. Falling back to local default connection string (postgres://postgres:password@localhost:5433/brillaracademy).'
    );
    connectionString = LOCAL_FALLBACK_DATABASE_URL;
  }

  pool = new Pool({ connectionString });
  console.log(`[DB] Connected using ${connectionString}`);
  pool.on('error', (error: Error) => {
    console.error('Unexpected database error', error);
  });

  return pool;
}
