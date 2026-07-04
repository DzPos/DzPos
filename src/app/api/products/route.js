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
      sql: 'SELECT * FROM products WHERE user_id = ? ORDER BY category, name',
      args: [userId]
    });
    return NextResponse.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const { action, id, sku, name, price, stock, category } = body;

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'Product ID is required for deletion' }, { status: 400 });
      }
      await db.execute({
        sql: 'DELETE FROM products WHERE id = ? AND user_id = ?',
        args: [id, userId]
      });
      return NextResponse.json({ success: true, message: 'Product deleted' });
    }

    if (action === 'update') {
      if (!id || !sku || !name || price === undefined || stock === undefined || !category) {
        return NextResponse.json({ success: false, error: 'Missing required fields for update' }, { status: 400 });
      }
      
      // Check SKU uniqueness excluding current product for this user
      const existing = await db.execute({
        sql: 'SELECT id FROM products WHERE user_id = ? AND sku = ? AND id != ?',
        args: [userId, sku, id]
      });
      if (existing.rows.length > 0) {
        return NextResponse.json({ success: false, error: 'Product with this SKU already exists in your catalog' }, { status: 400 });
      }

      await db.execute({
        sql: 'UPDATE products SET sku = ?, name = ?, price = ?, stock = ?, category = ? WHERE id = ? AND user_id = ?',
        args: [sku, name, parseFloat(price), parseInt(stock), category, id, userId]
      });
      return NextResponse.json({ success: true, message: 'Product updated' });
    }

    // Default to create
    if (!sku || !name || price === undefined || stock === undefined || !category) {
      return NextResponse.json({ success: false, error: 'Missing required fields for product creation' }, { status: 400 });
    }

    // Check SKU uniqueness for this user
    const existing = await db.execute({
      sql: 'SELECT id FROM products WHERE user_id = ? AND sku = ?',
      args: [userId, sku]
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Product with this SKU already exists in your catalog' }, { status: 400 });
    }

    const newId = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT INTO products (id, user_id, sku, name, price, stock, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [newId, userId, sku, name, parseFloat(price), parseInt(stock), category, new Date().toISOString()]
    });
    return NextResponse.json({ success: true, message: 'Product created', id: newId });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
