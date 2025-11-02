import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  pool = new Pool({ connectionString });
  pool.on('error', (error: Error) => {
    console.error('Unexpected database error', error);
  });

  return pool;
}
