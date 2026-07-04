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

export async function POST(req) {
  try {
    await ensureDb();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const result = await db.execute({
      sql: 'SELECT id, email, shop_name, sofizpay_key FROM users WHERE email = ? AND password = ?',
      args: [cleanEmail, hashedPassword]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        shopName: user.shop_name,
        sofizpayKey: user.sofizpay_key,
        token: `session_${crypto.randomUUID().substring(0, 8)}`
      }
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
