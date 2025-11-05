import { Pool } from 'pg';
let pool = null;
export function getPool() {
    if (pool) {
        return pool;
    }
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        return null;
    }
    pool = new Pool({ connectionString });
    pool.on('error', (error) => {
        console.error('Unexpected database error', error);
    });
    return pool;
}
//# sourceMappingURL=pool.js.map