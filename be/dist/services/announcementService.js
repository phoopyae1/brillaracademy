import { getPool } from '../db/pool.js';
export async function createAnnouncement(input) {
    const pool = getPool();
    if (!pool) {
        throw new Error('Database connection not available.');
    }
    try {
        const { rows } = await pool.query(`INSERT INTO announcements (title, content, type, event_date, posted_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, content, type, 
                 to_char(event_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS event_date,
                 posted_by,
                 to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at`, [input.title, input.content, input.type, input.eventDate || null, input.postedBy]);
        return normalizeAnnouncement(rows[0]);
    }
    catch (error) {
        console.error('Failed to create announcement', error);
        throw new Error('Unable to create announcement right now.');
    }
}
export async function listAnnouncements() {
    const pool = getPool();
    if (!pool) {
        return [];
    }
    try {
        const { rows } = await pool.query(`SELECT a.id, a.title, a.content, a.type,
              to_char(a.event_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS event_date,
              a.posted_by,
              to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
              sa.display_name AS posted_by_name
       FROM announcements a
       LEFT JOIN staff_accounts sa ON a.posted_by = sa.id
       ORDER BY a.created_at DESC`);
        return rows.map(normalizeAnnouncement);
    }
    catch (error) {
        console.error('Failed to list announcements', error);
        return [];
    }
}
export async function deleteAnnouncement(id) {
    const pool = getPool();
    if (!pool) {
        throw new Error('Database connection not available.');
    }
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    }
    catch (error) {
        console.error('Failed to delete announcement', error);
        throw new Error('Unable to delete announcement right now.');
    }
}
function normalizeAnnouncement(row) {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type || 'announcement',
        eventDate: row.event_date || null,
        postedBy: row.posted_by,
        createdAt: row.created_at,
        postedByName: row.posted_by_name || null
    };
}
//# sourceMappingURL=announcementService.js.map