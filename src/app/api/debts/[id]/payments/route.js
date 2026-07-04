import { db, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export async function GET(req, { params }) {
  try {
    await ensureDb();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }
    const { id: debtId } = params;

    // Verify debt belongs to this user
    const debtCheck = await db.execute({
      sql: 'SELECT id FROM debts WHERE id = ? AND user_id = ?',
      args: [debtId, userId]
    });

    if (debtCheckCheck(debtCheck)) {
      return NextResponse.json({ success: false, error: 'Debt not found' }, { status: 404 });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC',
      args: [debtId]
    });

    return NextResponse.json({ success: true, payments: result.rows });
  } catch (error) {
    console.error('Debt payments GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function debtCheckCheck(debtCheck) {
  return debtCheck.rows.length === 0;
}

export async function POST(req, { params }) {
  try {
    await ensureDb();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }
    const { id: debtId } = params;
    const body = await req.json();
    const { amount, paymentMethod } = body;

    if (amount === undefined || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid payment amount' }, { status: 400 });
    }

    // Fetch current debt
    const debtRes = await db.execute({
      sql: 'SELECT remaining_amount, debt_amount FROM debts WHERE id = ? AND user_id = ?',
      args: [debtId, userId]
    });

    if (debtRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Debt not found' }, { status: 404 });
    }

    const debt = debtRes.rows[0];
    const remainingAmount = parseFloat(debt.remaining_amount);
    const payAmount = parseFloat(amount);

    if (payAmount > remainingAmount) {
      return NextResponse.json({ success: false, error: 'Payment amount exceeds remaining debt' }, { status: 400 });
    }

    const newRemaining = remainingAmount - payAmount;
    const newStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    // Insert payment record
    await db.execute({
      sql: 'INSERT INTO debt_payments (id, debt_id, amount_paid, payment_method, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), debtId, payAmount, paymentMethod || 'cash', new Date().toISOString()]
    });

    // Update debt record
    await db.execute({
      sql: 'UPDATE debts SET remaining_amount = ?, status = ? WHERE id = ? AND user_id = ?',
      args: [newRemaining, newStatus, debtId, userId]
    });

    return NextResponse.json({ success: true, message: 'Payment recorded successfully', newRemaining, newStatus });
  } catch (error) {
    console.error('Debt payments POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
