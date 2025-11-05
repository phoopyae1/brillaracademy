import 'dotenv/config';
import { getPool } from './pool.js';
async function migrateAnnouncements() {
    const pool = getPool();
    if (!pool) {
        console.error('No database connection available. Please set DATABASE_URL environment variable.');
        process.exit(1);
    }
    try {
        console.log('Creating announcements table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'event')),
        event_date TIMESTAMPTZ,
        posted_by INTEGER REFERENCES staff_accounts(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
        console.log('✓ Announcements table created successfully!');
        process.exit(0);
    }
    catch (error) {
        if (error?.code === '42P07') {
            console.log('✓ Announcements table already exists.');
            process.exit(0);
        }
        console.error('Error creating announcements table:', error);
        process.exit(1);
    }
}
void migrateAnnouncements();
//# sourceMappingURL=migrateAnnouncements.js.map