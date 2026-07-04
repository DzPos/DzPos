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

    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get('saleId');
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Fetch details of a single sale for receipt printing if saleId is provided
    if (saleId) {
      const saleRes = await db.execute({
        sql: 'SELECT * FROM sales WHERE id = ? AND user_id = ?',
        args: [saleId, userId]
      });

      if (saleRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
      }

      const itemsRes = await db.execute({
        sql: `
          SELECT si.quantity, si.price, p.name, p.sku 
          FROM sale_items si 
          JOIN products p ON si.product_id = p.id 
          WHERE si.sale_id = ? AND p.user_id = ?
        `,
        args: [saleId, userId]
      });

      return NextResponse.json({
        success: true,
        sale: saleRes.rows[0],
        items: itemsRes.rows
      });
    }

    // 2. Fetch general report statistics for the given date
    const dateLike = `${dateParam}%`;

    // Aggregate stats for the day scoped to this user
    const statsRes = await db.execute({
      sql: `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as transaction_count
        FROM sales 
        WHERE status = 'completed' AND user_id = ? AND created_at LIKE ?
      `,
      args: [userId, dateLike]
    });

    const breakdownRes = await db.execute({
      sql: `
        SELECT payment_method, COALESCE(SUM(total_amount), 0) as total
        FROM sales
        WHERE status = 'completed' AND user_id = ? AND created_at LIKE ?
        GROUP BY payment_method
      `,
      args: [userId, dateLike]
    });

    // Recent 50 sales scoped to this user
    const salesHistoryRes = await db.execute({
      sql: 'SELECT * FROM sales WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      args: [userId]
    });

    // Past EOD reports scoped to this user
    const eodReportsRes = await db.execute({
      sql: 'SELECT * FROM eod_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 30',
      args: [userId]
    });

    const stats = statsRes.rows[0];
    const breakdown = { cash: 0, card: 0, sofizpay: 0 };
    breakdownRes.rows.forEach(row => {
      breakdown[row.payment_method] = row.total;
    });

    return NextResponse.json({
      success: true,
      stats: {
        date: dateParam,
        totalSales: stats.total_sales,
        transactionCount: stats.transaction_count,
        breakdown
      },
      salesHistory: salesHistoryRes.rows,
      eodReports: eodReportsRes.rows
    });

  } catch (error) {
    console.error('Reports GET API error:', error);
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
    const { date } = body;

    const reportDate = date || new Date().toISOString().split('T')[0];
    const dateLike = `${reportDate}%`;

    // Query completed sales for that date scoped to this user
    const salesRes = await db.execute({
      sql: 'SELECT payment_method, total_amount FROM sales WHERE status = "completed" AND user_id = ? AND created_at LIKE ?',
      args: [userId, dateLike]
    });

    let totalSales = 0;
    let transactionCount = salesRes.rows.length;
    let cashTotal = 0;
    let cardTotal = 0;
    let sofizpayTotal = 0;

    salesRes.rows.forEach(sale => {
      const amt = parseFloat(sale.total_amount);
      totalSales += amt;
      if (sale.payment_method === 'cash') cashTotal += amt;
      else if (sale.payment_method === 'card') cardTotal += amt;
      else if (sale.payment_method === 'sofizpay') sofizpayTotal += amt;
    });

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Insert or replace EOD report scoped to this user
    await db.execute({
      sql: `
        INSERT OR REPLACE INTO eod_reports (
          id, user_id, report_date, total_sales, transaction_count, 
          cash_total, card_total, sofizpay_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId, reportDate, totalSales, transactionCount, cashTotal, cardTotal, sofizpayTotal, createdAt]
    });

    return NextResponse.json({
      success: true,
      message: 'End of Day report generated successfully',
      report: {
        id,
        reportDate,
        totalSales,
        transactionCount,
        cashTotal,
        cardTotal,
        sofizpayTotal,
        createdAt
      }
    });

  } catch (error) {
    console.error('Reports POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
