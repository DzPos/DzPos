import { db, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

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
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }

    const body = await req.json();
    const { shopName, sofizpayKey } = body;

    if (!shopName || !sofizpayKey) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const cleanShopName = shopName.trim();
    const cleanKey = sofizpayKey.trim();

    if (!cleanShopName || !cleanKey) {
      return NextResponse.json({ success: false, error: 'Shop name and SofizPay key cannot be empty' }, { status: 400 });
    }

    // Update users table
    await db.execute({
      sql: 'UPDATE users SET shop_name = ?, sofizpay_key = ? WHERE id = ?',
      args: [cleanShopName, cleanKey, userId]
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        shopName: cleanShopName,
        sofizpayKey: cleanKey
      }
    });

  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
