import { getPool } from '../db/pool.js';
import { fallbackFeePayments } from './fallbackData.js';
import type { FeePayment } from './types.js';

/**
 * Confirms all pending class registrations for a student if all outstanding fees are paid.
 * This is called automatically when a fee payment is recorded.
 */
async function confirmRegistrationsIfAllFeesPaid(
  studentId: number,
  confirmedBy?: number
): Promise<void> {
  const pool = getPool();
  
  if (!pool) {
    // In-memory mode: skip confirmation
    return;
  }

  try {
    // Check if student has any pending fees
    const pendingFeesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM fee_payments
       WHERE student_id = $1 AND status = 'pending'`,
      [studentId]
    );

    const pendingCount = Number(pendingFeesResult.rows[0]?.count || 0);

    // If there are still pending fees, don't confirm registrations yet
    if (pendingCount > 0) {
      console.log(`[FinanceService] Student ${studentId} still has ${pendingCount} pending fee(s). Not confirming registrations yet.`);
      return;
    }

    // All fees are paid - confirm all pending registrations for this student
    const confirmResult = await pool.query(
      `UPDATE class_registrations
       SET confirmed_by = $1
       WHERE student_id = $2 AND confirmed_by IS NULL
       RETURNING id, class_name`,
      [confirmedBy ?? null, studentId]
    );

    if (confirmResult.rows.length > 0) {
      const confirmedClasses = confirmResult.rows.map((row: any) => row.class_name).join(', ');
      console.log(`[FinanceService] ✓ Confirmed ${confirmResult.rows.length} registration(s) for student ${studentId}: ${confirmedClasses}`);
    } else {
      console.log(`[FinanceService] Student ${studentId} has no pending registrations to confirm.`);
    }
  } catch (error) {
    // Don't fail the payment if confirmation fails - log and continue
    console.error(`[FinanceService] Failed to confirm registrations for student ${studentId} after payment:`, error);
  }
}

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
    // In-memory mode: try to update existing fee if amount matches, otherwise create new
    const existingFee = inMemoryFeePayments.find(
      (fee) => fee.studentId === input.studentId && 
                fee.status === 'pending' && 
                Math.abs(fee.amount - input.amount) < 0.01
    );
    
    if (existingFee) {
      // Update existing fee status to paid
      existingFee.status = paymentStatus;
      existingFee.receivedBy = receivedBy ?? null;
      existingFee.receivedAt = new Date().toISOString();
      
      // In in-memory mode, we can't confirm registrations (no database access)
      // This would need to be handled separately if in-memory mode is used
      return existingFee;
    }

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
    
    // In in-memory mode, we can't confirm registrations (no database access)
    // This would need to be handled separately if in-memory mode is used
    return payment;
  }

  try {
    // Try to find and update existing pending fee
    // Priority: match by description (if provided) + studentId + amount, then fallback to just amount
    let existingFee;
    
    if (description) {
      // First try exact match by description + studentId + amount (most specific)
      existingFee = await pool.query(
        `SELECT id, amount FROM fee_payments 
         WHERE student_id = $1 AND status = 'pending' 
         AND description = $2
         AND ABS(amount - $3) < 0.01
         ORDER BY id DESC
         LIMIT 1`,
        [input.studentId, description, input.amount]
      );
      
      // If no exact match, try partial description match (for cases where description includes multiple fees)
      if (existingFee.rows.length === 0) {
        existingFee = await pool.query(
          `SELECT id, amount, description FROM fee_payments 
           WHERE student_id = $1 AND status = 'pending' 
           AND ABS(amount - $2) < 0.01
           AND (description ILIKE $3 OR $3 ILIKE '%' || description || '%')
           ORDER BY id DESC
           LIMIT 1`,
          [input.studentId, input.amount, `%${description}%`]
        );
      }
    }
    
    // If no match by description, try matching by amount only (for backwards compatibility)
    if (!existingFee || existingFee.rows.length === 0) {
      existingFee = await pool.query(
        `SELECT id, amount FROM fee_payments 
         WHERE student_id = $1 AND status = 'pending' 
         AND ABS(amount - $2) < 0.01
         ORDER BY id DESC
         LIMIT 1`,
        [input.studentId, input.amount]
      );
    }

    if (existingFee.rows.length > 0) {
      // Update existing fee to paid
      const { rows } = await pool.query(
        `UPDATE fee_payments 
         SET status = $1, received_by = $2, received_at = NOW()
         WHERE id = $3
         RETURNING id, student_id, amount, description, status, received_by, received_at, due_date`,
        [paymentStatus, receivedBy ?? null, existingFee.rows[0].id]
      );

      const payment = normalizeFeePayment(rows[0]);

      // If payment status is 'paid', check if all outstanding fees are paid and confirm registrations
      if (paymentStatus === 'paid') {
        await confirmRegistrationsIfAllFeesPaid(input.studentId, receivedBy);
      }

      return payment;
    }

    // No matching fee found, create new payment entry
    const { rows } = await pool.query(
      `INSERT INTO fee_payments (student_id, amount, description, status, received_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_id, amount, description, status, received_by, received_at, due_date`,
      [input.studentId, input.amount, description, paymentStatus, receivedBy ?? null, dueDate]
    );

    const payment = normalizeFeePayment(rows[0]);

    // If payment status is 'paid', check if all outstanding fees are paid and confirm registrations
    if (paymentStatus === 'paid') {
      await confirmRegistrationsIfAllFeesPaid(input.studentId, receivedBy);
    }

    return payment;
  } catch (error) {
    console.error('Failed to record fee payment', error);
    throw error;
  }
}
