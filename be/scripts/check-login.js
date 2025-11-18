#!/usr/bin/env node

/**
 * Diagnostic script to check login credentials and database state
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5433/brillaracademy';

async function checkLogin() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔍 Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Check students
    console.log('📚 Checking students...');
    const studentResult = await pool.query('SELECT id, email, first_name, last_name, CASE WHEN password_hash IS NULL THEN \'NULL\' WHEN password_hash = \'\' THEN \'EMPTY\' ELSE \'HAS_HASH\' END as password_status FROM students LIMIT 10');
    
    if (studentResult.rows.length === 0) {
      console.log('❌ No students found in database!');
      console.log('💡 Run: psql "$DATABASE_URL" -f be/db/seed.sql\n');
    } else {
      console.log(`✅ Found ${studentResult.rows.length} student(s):`);
      studentResult.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Email: ${row.email}, Name: ${row.first_name} ${row.last_name}, Password: ${row.password_status}`);
      });
      console.log('');

      // Test login for first student
      const testStudent = studentResult.rows[0];
      console.log(`🔐 Testing login for: ${testStudent.email}`);
      
      const studentWithHash = await pool.query(
        'SELECT password_hash FROM students WHERE id = $1',
        [testStudent.id]
      );
      
      if (studentWithHash.rows[0]?.password_hash) {
        const hash = studentWithHash.rows[0].password_hash;
        const testPasswords = ['changeme', 'password', 'test123'];
        
        for (const pwd of testPasswords) {
          const matches = bcrypt.compareSync(pwd, hash);
          if (matches) {
            console.log(`   ✅ Password "${pwd}" matches!`);
            console.log(`   📝 Try logging in with:`);
            console.log(`      Email: ${testStudent.email}`);
            console.log(`      Password: ${pwd}\n`);
            break;
          }
        }
      }
    }

    // Check staff
    console.log('👥 Checking staff accounts...');
    const staffResult = await pool.query('SELECT id, email, display_name, role, CASE WHEN password_hash IS NULL THEN \'NULL\' WHEN password_hash = \'\' THEN \'EMPTY\' ELSE \'HAS_HASH\' END as password_status FROM staff_accounts LIMIT 10');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff accounts found in database!');
      console.log('💡 Run: psql "$DATABASE_URL" -f be/db/seed.sql\n');
    } else {
      console.log(`✅ Found ${staffResult.rows.length} staff account(s):`);
      staffResult.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Email: ${row.email}, Name: ${row.display_name}, Role: ${row.role}, Password: ${row.password_status}`);
      });
      console.log('');

      // Test login for first staff
      const testStaff = staffResult.rows[0];
      console.log(`🔐 Testing login for: ${testStaff.email}`);
      
      const staffWithHash = await pool.query(
        'SELECT password_hash FROM staff_accounts WHERE id = $1',
        [testStaff.id]
      );
      
      if (staffWithHash.rows[0]?.password_hash) {
        const hash = staffWithHash.rows[0].password_hash;
        const testPasswords = ['changeme', 'password', 'test123'];
        
        for (const pwd of testPasswords) {
          const matches = bcrypt.compareSync(pwd, hash);
          if (matches) {
            console.log(`   ✅ Password "${pwd}" matches!`);
            console.log(`   📝 Try logging in with:`);
            console.log(`      Email: ${testStaff.email}`);
            console.log(`      Password: ${pwd}\n`);
            break;
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Database is not running. Start your PostgreSQL server first.');
    } else if (error.code === '42P01') {
      console.error('💡 Database tables do not exist. Run: psql "$DATABASE_URL" -f be/db/schema.sql');
    }
  } finally {
    await pool.end();
  }
}

checkLogin();

