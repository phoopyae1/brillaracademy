import type { Feature } from './types.js';
import { getPool } from '../db/pool.js';
import { fallbackFeatures } from './fallbackData.js';

export async function listFeatures(): Promise<Feature[]> {
  const pool = getPool();

  if (!pool) {
    return fallbackFeatures;
  }

  try {
    const { rows } = await pool.query<Feature>(
      'SELECT id, name, description, category, icon FROM features ORDER BY id ASC'
    );
    return rows.length ? rows : fallbackFeatures;
  } catch (error) {
    console.error('Failed to load features from database', error);
    return fallbackFeatures;
  }
}
