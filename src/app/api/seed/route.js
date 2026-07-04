import { db, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';

const sampleProducts = [
  { sku: 'CAF-EXP', name: 'Café Expresso', price: 100, stock: 50, category: 'Beverages' },
  { sku: 'TEA-MNT', name: 'Thé à la Menthe', price: 80, stock: 40, category: 'Beverages' },
  { sku: 'SDA-SEL', name: 'Sodas Selecto', price: 150, stock: 30, category: 'Beverages' },
  { sku: 'SDA-HAM', name: 'Hamoud Boualem', price: 150, stock: 30, category: 'Beverages' },
  { sku: 'WAT-MIN', name: 'Eau Minérale (0.5L)', price: 60, stock: 100, category: 'Beverages' },
  
  { sku: 'SND-CAL', name: 'Calentica (Garanti)', price: 120, stock: 25, category: 'Food' },
  { sku: 'BRK-CHM', name: 'Bourek Viande Hachée', price: 180, stock: 15, category: 'Food' },
  { sku: 'MHJ-HRR', name: 'Mahjouba Harra', price: 100, stock: 35, category: 'Food' },
  { sku: 'CHX-BIS', name: 'Chakhchoukha de Biskra', price: 550, stock: 10, category: 'Food' },
  
  { sku: 'CRN-BTR', name: 'Croissant au Beurre', price: 90, stock: 20, category: 'Bakery' },
  { sku: 'PNS-CHL', name: 'Pain au Chocolat', price: 100, stock: 20, category: 'Bakery' },
  { sku: 'MFE-ALG', name: 'Mille-feuille', price: 120, stock: 15, category: 'Bakery' },
];

export async function POST(req) {
  try {
    await initDb();
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { mode } = body; // 'reset' to delete existing products and sales for this user

    if (mode === 'reset') {
      // Delete items belonging to sales of this user
      await db.execute({
        sql: 'DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ?)',
        args: [userId]
      });
      await db.execute({
        sql: 'DELETE FROM sales WHERE user_id = ?',
        args: [userId]
      });
      await db.execute({
        sql: 'DELETE FROM eod_reports WHERE user_id = ?',
        args: [userId]
      });
      await db.execute({
        sql: 'DELETE FROM products WHERE user_id = ?',
        args: [userId]
      });
    }

    const now = new Date().toISOString();
    let seededCount = 0;

    for (const prod of sampleProducts) {
      // Check if product with SKU already exists for this specific user
      const existing = await db.execute({
        sql: 'SELECT id FROM products WHERE user_id = ? AND sku = ?',
        args: [userId, prod.sku]
      });

      if (existing.rows.length === 0) {
        await db.execute({
          sql: `
            INSERT INTO products (id, user_id, sku, name, price, stock, category, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [crypto.randomUUID(), userId, prod.sku, prod.name, prod.price, prod.stock, prod.category, now]
        });
        seededCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeding completed. Added ${seededCount} sample products for your store.`,
      seeded: seededCount
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
