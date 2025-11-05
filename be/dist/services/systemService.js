import { getPool } from '../db/pool.js';
export async function getSystemSetting(key) {
    const pool = getPool();
    if (!pool) {
        // In-memory fallback
        if (key === 'current_semester') {
            return '1/2026';
        }
        return null;
    }
    try {
        const { rows } = await pool.query(`SELECT value FROM system_settings WHERE key = $1`, [key]);
        return rows.length > 0 ? rows[0].value : null;
    }
    catch (error) {
        console.error('Failed to fetch system setting', error);
        return null;
    }
}
export async function setSystemSetting(key, value, updatedBy) {
    const pool = getPool();
    if (!pool) {
        // In-memory mode - settings not persisted
        return;
    }
    try {
        await pool.query(`INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`, [key, value, updatedBy ?? null]);
    }
    catch (error) {
        console.error('Failed to set system setting', error);
        throw error;
    }
}
export async function getCurrentSemester() {
    const currentSemester = await getSystemSetting('current_semester');
    return currentSemester || '1/2026';
}
//# sourceMappingURL=systemService.js.map