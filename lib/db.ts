import { Pool } from 'pg';
import { Feature, fallbackFeatures } from '@/lib/features';

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

const pool = globalThis.pgPool ??
  (connectionString
    ? new Pool({ connectionString, max: 5, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
    : undefined);

if (!globalThis.pgPool && pool) {
  globalThis.pgPool = pool;
}

export async function fetchFeatures(): Promise<Feature[]> {
  if (!pool) {
    return fallbackFeatures;
  }

  try {
    const { rows } = await pool.query<Feature>(
      'SELECT id, name, description, category, icon FROM features ORDER BY id ASC'
    );

    if (!rows.length) {
      return fallbackFeatures;
    }

    return rows;
  } catch (error) {
    console.error('Failed to load features from PostgreSQL. Falling back to static data.', error);
    return fallbackFeatures;
  }
}
