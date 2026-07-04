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
    const { email, password, shop_name, sofizpay_key } = body;

    if (!email || !password || !shop_name || !sofizpay_key) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize email & key
    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = sofizpay_key.trim();

    if (!cleanKey) {
      return NextResponse.json({ success: false, error: 'SofizPay Public Key cannot be empty' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [cleanEmail]
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }

    // Hash password securely with Node.js built-in crypto module
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: 'INSERT INTO users (id, email, password, shop_name, sofizpay_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userId, cleanEmail, hashedPassword, shop_name.trim(), cleanKey, now]
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant account registered successfully'
    });

  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
