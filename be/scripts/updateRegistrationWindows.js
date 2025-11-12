import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateRegistrationWindows() {
  try {
    console.log('Updating registration windows...');
    
    // Update 1/2026
    const result1 = await pool.query(
      `UPDATE registration_windows 
       SET opens_at = '2025-11-11T12:00:00Z', closes_at = '2026-01-05T23:59:59Z'
       WHERE semester = '1/2026'`
    );
    console.log(`Updated 1/2026: ${result1.rowCount} row(s) affected`);
    
    // Update 2/2026
    const result2 = await pool.query(
      `UPDATE registration_windows 
       SET opens_at = '2026-03-15T12:00:00Z', closes_at = '2026-05-05T23:59:59Z'
       WHERE semester = '2/2026'`
    );
    console.log(`Updated 2/2026: ${result2.rowCount} row(s) affected`);
    
    // Verify the updates
    const verify = await pool.query(
      `SELECT id, semester, status, opens_at, closes_at 
       FROM registration_windows 
       ORDER BY semester`
    );
    
    console.log('\nUpdated registration windows:');
    verify.rows.forEach(row => {
      console.log(`  ${row.semester}: Opens ${new Date(row.opens_at).toLocaleString()}, Closes ${new Date(row.closes_at).toLocaleString()}`);
    });
    
    console.log('\n✅ Registration windows updated successfully!');
  } catch (error) {
    console.error('❌ Error updating registration windows:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateRegistrationWindows();

