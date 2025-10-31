import bcrypt from 'bcryptjs';
import { getPool } from '../db/pool.js';
import { fallbackStaff } from './fallbackData.js';
import type { StaffAccount, StaffRole } from './types.js';

let inMemoryStaff = [...fallbackStaff];
let inMemorySecrets = new Map<number, string>();
let nextStaffId = fallbackStaff.length + 1;

for (const staff of fallbackStaff) {
  inMemorySecrets.set(staff.id, bcrypt.hashSync('changeme', 10));
}

function normalizeStaff(row: any): StaffAccount {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function listStaff(): Promise<StaffAccount[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryStaff;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, display_name, email, role, created_at
       FROM staff_accounts
       ORDER BY created_at DESC`
    );

    return rows.map(normalizeStaff);
  } catch (error) {
    console.error('Failed to fetch staff accounts', error);
    return inMemoryStaff;
  }
}

export async function findStaffByEmail(email: string): Promise<(StaffAccount & { passwordHash: string }) | null> {
  const pool = getPool();

  if (!pool) {
    const account = inMemoryStaff.find((item) => item.email === email);
    if (!account) {
      return null;
    }

    const passwordHash = inMemorySecrets.get(account.id) ?? bcrypt.hashSync('changeme', 10);
    return { ...account, passwordHash };
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, display_name, email, role, created_at, password_hash
       FROM staff_accounts
       WHERE email = $1`,
      [email]
    );

    if (!rows.length) {
      return null;
    }

    const [row] = rows;
    return { ...normalizeStaff(row), passwordHash: row.password_hash };
  } catch (error) {
    console.error('Failed to find staff account by email', error);
    return null;
  }
}

export async function createStaffAccount(
  displayName: string,
  email: string,
  password: string,
  role: StaffRole,
  createdBy?: number
): Promise<StaffAccount> {
  const pool = getPool();
  const hashedPassword = await bcrypt.hash(password, 10);

  if (!pool) {
    const staff: StaffAccount = {
      id: nextStaffId++,
      displayName,
      email,
      role,
      createdAt: new Date().toISOString()
    };

    inMemoryStaff = [staff, ...inMemoryStaff];
    inMemorySecrets.set(staff.id, hashedPassword);
    return staff;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO staff_accounts (display_name, email, password_hash, role, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, display_name, email, role, created_at`,
      [displayName, email, hashedPassword, role, createdBy ?? null]
    );

    return normalizeStaff(rows[0]);
  } catch (error) {
    console.error('Failed to create staff account', error);
    throw error;
  }
}

export async function ensureInitialItAdmin(): Promise<StaffAccount> {
  const email = process.env.INITIAL_IT_ADMIN_EMAIL ?? 'it-admin@brillaracademy.edu';
  const password = process.env.INITIAL_IT_ADMIN_PASSWORD ?? 'changeme';
  const displayName = process.env.INITIAL_IT_ADMIN_NAME ?? 'Ada Lovelace';

  const existing = await findStaffByEmail(email);
  if (existing) {
    return existing;
  }

  return createStaffAccount(displayName, email, password, 'IT_ADMIN');
}
