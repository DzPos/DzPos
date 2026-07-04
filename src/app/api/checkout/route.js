import { db, initDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import SofizPaySDK from 'sofizpay-sdk-js';

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
    const { paymentMethod, items, totalAmount, amountPaid: amountPaidRaw, customer, sofizpayConfig } = body;

    if (!paymentMethod || !items || items.length === 0 || totalAmount === undefined) {
      return NextResponse.json({ success: false, error: 'Missing checkout parameters' }, { status: 400 });
    }

    const amountPaid = amountPaidRaw !== undefined ? parseFloat(amountPaidRaw) : parseFloat(totalAmount);
    const debtAmount = parseFloat(totalAmount) - amountPaid;

    if (debtAmount > 0 && (!customer || !customer.name || !customer.name.trim())) {
      return NextResponse.json({ success: false, error: 'Customer Name is required to record a transaction with outstanding debt.' }, { status: 400 });
    }

    const saleId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Verify stock availability for all items in the merchant's catalog
    for (const item of items) {
      const productRes = await db.execute({
        sql: 'SELECT name, stock FROM products WHERE id = ? AND user_id = ?',
        args: [item.productId, userId]
      });
      if (productRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: `Product not found: ${item.name}` }, { status: 400 });
      }
      const product = productRes.rows[0];
      if (paymentMethod !== 'sofizpay' && paymentMethod !== 'card' && product.stock < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${item.quantity}` 
        }, { status: 400 });
      }
    }

    // If SofizPay/Card and amountPaid > 0, we do online payment gateway.
    // If amountPaid === 0, then this is a 100% debt checkout and can be completed instantly!
    if ((paymentMethod === 'sofizpay' || paymentMethod === 'card') && amountPaid > 0) {
      const merchantRes = await db.execute({
        sql: 'SELECT sofizpay_key FROM users WHERE id = ?',
        args: [userId]
      });
      const dbAccount = merchantRes.rows[0]?.sofizpay_key || 'G_MOCK_ACCOUNT';
      const account = (sofizpayConfig && sofizpayConfig.account && sofizpayConfig.account !== 'G_MOCK_ACCOUNT')
        ? sofizpayConfig.account.trim()
        : dbAccount;
      const isSandbox = sofizpayConfig?.isSandbox !== false; // default to sandbox
      
      let cibTransactionId = `mock_tx_${crypto.randomUUID().substring(0, 8)}`;
      let paymentUrl = '';
      let isMock = true;

      if (account && account !== 'G_MOCK_ACCOUNT') {
        try {
          const originUrl = req.headers.get('origin') || '';
          const callbackUrl = `${originUrl}/api/payments/cib-callback?saleId=${saleId}`;
          
          const fullName = customer?.name || 'Walk-in Customer';
          const phone = customer?.phone || '+213550000000';
          const email = customer?.email || 'customer@dzpos.dz';
          const memo = `Order #${saleId.substring(0, 8)}`;
          
          const makeCibUrl = `https://sofizpay.com/make-cib-transaction/?account=${encodeURIComponent(account)}&amount=${encodeURIComponent(amountPaid)}&full_name=${encodeURIComponent(fullName)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&return_url=${encodeURIComponent(callbackUrl)}&memo=${encodeURIComponent(memo)}&redirect=no&keep_return_url=False`;
          
          console.log('Initiating direct CIB transaction:', makeCibUrl);
          const apiRes = await fetch(makeCibUrl, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (!apiRes.ok) {
            throw new Error(`SofizPay API returned HTTP status ${apiRes.status}`);
          }
          
          const response = await apiRes.json();
          
          if (response && (response.cib_transaction_id || (response.data && response.data.cib_transaction_id) || response.success || response.url || response.payment_url)) {
            cibTransactionId = response.cib_transaction_id || (response.data && response.data.cib_transaction_id) || response.order_number || (response.data && response.data.order_number) || cibTransactionId;
            paymentUrl = response.url || response.payment_url || (response.data && response.data.url) || (response.data && response.data.payment_url) || '';
            isMock = false;
          } else {
            console.warn('SofizPay direct API returned failure or unexpected structure, falling back to simulator:', response);
          }
        } catch (sdkErr) {
          console.error('SofizPay direct API call failed, falling back to simulator:', sdkErr);
        }
      }

      // If mock, generate local simulator checkout URL with amountPaid
      if (isMock) {
        paymentUrl = `/dashboard?payment_simulator=true&cib_id=${cibTransactionId}&sale_id=${saleId}&amount=${amountPaid}`;
      }

      // Record pending sale scoped to this merchant
      await db.execute({
        sql: `INSERT INTO sales (
          id, user_id, total_amount, payment_method, status, sofizpay_id, 
          customer_name, customer_phone, customer_email, amount_paid, debt_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          saleId, 
          userId, 
          parseFloat(totalAmount), 
          paymentMethod, 
          'pending', 
          cibTransactionId,
          customer?.name || null,
          customer?.phone || null,
          customer?.email || null,
          parseFloat(amountPaid),
          parseFloat(debtAmount),
          createdAt
        ]
      });

      // Record items
      for (const item of items) {
        await db.execute({
          sql: 'INSERT INTO sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), saleId, item.productId, parseInt(item.quantity), parseFloat(item.price)]
        });
      }

      return NextResponse.json({
        success: true,
        paymentMethod,
        saleId,
        cibTransactionId,
        paymentUrl,
        isMock,
        amount: amountPaid,
        account: account
      });

    } else {
      // Cash / Card / 100% Debt: completed transaction immediately scoped to this merchant
      await db.execute({
        sql: `INSERT INTO sales (
          id, user_id, total_amount, payment_method, status, 
          customer_name, customer_phone, customer_email, amount_paid, debt_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          saleId, 
          userId, 
          parseFloat(totalAmount), 
          paymentMethod, 
          'completed', 
          customer?.name || null,
          customer?.phone || null,
          customer?.email || null,
          parseFloat(amountPaid),
          parseFloat(debtAmount),
          createdAt
        ]
      });

      // Record items and decrement stock
      for (const item of items) {
        await db.execute({
          sql: 'INSERT INTO sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
          args: [crypto.randomUUID(), saleId, item.productId, parseInt(item.quantity), parseFloat(item.price)]
        });

        await db.execute({
          sql: 'UPDATE products SET stock = stock - ? WHERE id = ? AND user_id = ?',
          args: [parseInt(item.quantity), item.productId, userId]
        });
      }

      // Record debt in the debts table if debtAmount exists
      if (debtAmount > 0) {
        await db.execute({
          sql: `INSERT INTO debts (
            id, user_id, sale_id, customer_name, customer_phone, customer_email, 
            debt_amount, remaining_amount, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            userId,
            saleId,
            customer?.name || 'Customer',
            customer?.phone || '',
            customer?.email || '',
            parseFloat(debtAmount),
            parseFloat(debtAmount),
            'unpaid',
            createdAt
          ]
        });
      }

      return NextResponse.json({
        success: true,
        paymentMethod,
        saleId,
        message: 'Checkout completed successfully'
      });
    }

  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
