import { getPool } from '../db/pool.js';
import { fallbackFeePayments } from './fallbackData.js';
import type { FeePayment } from './types.js';

let inMemoryFeePayments = [...fallbackFeePayments];
let nextFeePaymentId = fallbackFeePayments.length + 1;

function normalizeFeePayment(row: any): FeePayment {
  return {
    id: row.id,
    studentId: row.student_id,
    amount: Number(row.amount),
    description: row.description,
    status: row.status,
    receivedBy: row.received_by ?? null,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at,
    dueDate: row.due_date instanceof Date ? row.due_date.toISOString() : row.due_date
  };
}

export async function listFeePayments(): Promise<FeePayment[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryFeePayments;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, student_id, amount, description, status, received_by, received_at, due_date
       FROM fee_payments
       ORDER BY received_at DESC`
    );

    return rows.map(normalizeFeePayment);
  } catch (error) {
    console.error('Failed to fetch fee payments', error);
    return inMemoryFeePayments;
  }
}

export async function listStudentFeePayments(studentId: number): Promise<FeePayment[]> {
  const pool = getPool();

  if (!pool) {
    return inMemoryFeePayments.filter((payment) => payment.studentId === studentId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, student_id, amount, description, status, received_by, received_at, due_date
       FROM fee_payments
       WHERE student_id = $1
       ORDER BY received_at DESC`,
      [studentId]
    );

    return rows.map(normalizeFeePayment);
  } catch (error) {
    console.error('Failed to fetch student fee payments', error);
    return inMemoryFeePayments.filter((payment) => payment.studentId === studentId);
  }
}

export type RecordFeePaymentInput = {
  studentId: number;
  amount: number;
  description?: string;
  status?: 'pending' | 'paid';
  dueDate?: string | null;
};

export async function recordFeePayment(
  input: RecordFeePaymentInput,
  receivedBy?: number
): Promise<FeePayment> {
  const pool = getPool();
  const paymentStatus = input.status ?? 'paid';
  const description = input.description ?? null;
  const dueDate = input.dueDate ?? null;

  if (!pool) {
    const payment: FeePayment = {
      id: nextFeePaymentId++,
      studentId: input.studentId,
      amount: input.amount,
      description,
      status: paymentStatus,
      receivedBy: receivedBy ?? null,
      receivedAt: new Date().toISOString(),
      dueDate
    };

    inMemoryFeePayments = [payment, ...inMemoryFeePayments];
    return payment;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO fee_payments (student_id, amount, description, status, received_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, amount, description, status, received_by, received_at, due_date`,
      [input.studentId, input.amount, description, paymentStatus, receivedBy ?? null, dueDate]
    );

    return normalizeFeePayment(rows[0]);
  } catch (error) {
    console.error('Failed to record fee payment', error);
    throw error;
  }
}
