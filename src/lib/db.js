import { createClient } from '@libsql/client';
import crypto from 'crypto';

const url = process.env.TURSO_URL;
const authToken = process.env.TURSO_TOKEN;

if (!url) {
  console.warn('Warning: TURSO_URL is not set. Database operations will fail.');
}

export const db = createClient({
  url: url || 'file:dzpos.db',
  authToken: authToken,
});

export async function completeSale(saleId, userId, actualPaidAmount) {
  // Get all items for the sale
  const itemsRes = await db.execute({
    sql: 'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
    args: [saleId]
  });

  // Decrement stock for each item in the merchant's inventory
  for (const item of itemsRes.rows) {
    await db.execute({
      sql: 'UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?',
      args: [parseInt(item.quantity), item.product_id, userId]
    });
  }

  // Fetch the sale from the database
  const saleRes = await db.execute({
    sql: 'SELECT customer_name, customer_phone, customer_email, total_amount, amount_paid, debt_amount, created_at FROM sales WHERE id = ?',
    args: [saleId]
  });

  if (saleRes.rows.length > 0) {
    const sale = saleRes.rows[0];
    const totalAmount = parseFloat(sale.total_amount);
    
    // If actualPaidAmount is provided, we override the amount_paid and debt_amount
    let finalAmountPaid = actualPaidAmount !== undefined ? parseFloat(actualPaidAmount) : parseFloat(sale.amount_paid || totalAmount);
    if (finalAmountPaid > totalAmount) {
      finalAmountPaid = totalAmount; // clamp to total
    }
    const finalDebtAmount = totalAmount - finalAmountPaid;

    // Update sale status, amount_paid and debt_amount in database
    await db.execute({
      sql: 'UPDATE sales SET status = ?, amount_paid = ?, debt_amount = ? WHERE id = ? AND user_id = ?',
      args: ['completed', finalAmountPaid, finalDebtAmount, saleId, userId]
    });

    if (finalDebtAmount > 0) {
      // Check if debt record already exists to prevent duplicate insertion
      const existingDebt = await db.execute({
        sql: 'SELECT id FROM debts WHERE sale_id = ?',
        args: [saleId]
      });
      if (existingDebt.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO debts (
            id, user_id, sale_id, customer_name, customer_phone, customer_email, 
            debt_amount, remaining_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            userId,
            saleId,
            sale.customer_name || 'Customer',
            sale.customer_phone || '',
            sale.customer_email || '',
            finalDebtAmount,
            finalDebtAmount,
            'unpaid',
            sale.created_at || new Date().toISOString()
          ]
        });
      }
    }
  }
}

export async function initDb() {
  try {
    // 0. Ensure users table is initialized first
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        shop_name TEXT NOT NULL,
        sofizpay_key TEXT NOT NULL DEFAULT 'G_MOCK_ACCOUNT',
        created_at TEXT NOT NULL
      )
    `);

    // Check if users table lacks sofizpay_key column
    try {
      await db.execute("SELECT sofizpay_key FROM users LIMIT 1");
    } catch (err) {
      console.log('Adding column sofizpay_key to users table...');
      try {
        await db.execute("ALTER TABLE users ADD COLUMN sofizpay_key TEXT NOT NULL DEFAULT 'G_MOCK_ACCOUNT'");
      } catch (alterErr) {
        console.error('Failed to add sofizpay_key column:', alterErr);
      }
    }

    // Check if migration is needed (if products table lacks user_id column)
    let needsMigration = false;
    try {
      const tableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'");
      if (tableCheck.rows.length > 0) {
        // Table exists, check if user_id column exists
        await db.execute("SELECT user_id FROM products LIMIT 1");
      }
    } catch (err) {
      // Column user_id doesn't exist, migration is required
      needsMigration = true;
    }

    if (needsMigration) {
      console.log('Migrating database schema for multi-tenant isolation...');
      // Drop dependent tables first
      await db.execute("DROP TABLE IF EXISTS sale_items");
      await db.execute("DROP TABLE IF EXISTS sales");
      await db.execute("DROP TABLE IF EXISTS eod_reports");
      await db.execute("DROP TABLE IF EXISTS products");
      console.log('Legacy tables dropped.');
    }

    // 1. Products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, sku)
      )
    `);

    // 2. Sales table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        total_amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL,
        sofizpay_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Check if sales table lacks customer_name, customer_phone, customer_email, amount_paid, debt_amount
    try {
      await db.execute("SELECT customer_name FROM sales LIMIT 1");
    } catch (err) {
      console.log('Adding debt-related columns to sales table...');
      try {
        await db.execute("ALTER TABLE sales ADD COLUMN customer_name TEXT");
        await db.execute("ALTER TABLE sales ADD COLUMN customer_phone TEXT");
        await db.execute("ALTER TABLE sales ADD COLUMN customer_email TEXT");
        await db.execute("ALTER TABLE sales ADD COLUMN amount_paid REAL DEFAULT 0");
        await db.execute("ALTER TABLE sales ADD COLUMN debt_amount REAL DEFAULT 0");
      } catch (alterErr) {
        console.error('Failed to add columns to sales:', alterErr);
      }
    }

    // Ensure amount_paid defaults to total_amount for existing sales that don't have it set
    try {
      await db.execute("UPDATE sales SET amount_paid = total_amount WHERE amount_paid IS NULL OR amount_paid = 0");
    } catch (updateErr) {
      console.log('Update amount_paid error (this might be fine if no rows exist):', updateErr.message);
    }

    // 3. Sale Items table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // 4. End-Of-Day Reports table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS eod_reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        report_date TEXT NOT NULL,
        total_sales REAL NOT NULL,
        transaction_count INTEGER NOT NULL,
        cash_total REAL NOT NULL,
        card_total REAL NOT NULL,
        sofizpay_total REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, report_date)
      )
    `);

    // 5. Debts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sale_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_email TEXT,
        debt_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE SET NULL
      )
    `);

    // 6. Debt Payments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id TEXT PRIMARY KEY,
        debt_id TEXT NOT NULL,
        amount_paid REAL NOT NULL,
        payment_method TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(debt_id) REFERENCES debts(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

