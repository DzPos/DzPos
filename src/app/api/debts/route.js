import { db, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

export async function GET(req) {
  try {
    await ensureDb();
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }

    const result = await db.execute({
      sql: 'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId]
    });

    return NextResponse.json({ success: true, debts: result.rows });
  } catch (error) {
    console.error('Debts GET API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
