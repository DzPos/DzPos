import { db, initDb, completeSale } from '@/lib/db';
import { NextResponse } from 'next/server';

let dbInitialized = false;

async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}


export async function GET(req) {
  const originUrl = req.headers.get('origin') || new URL(req.url).origin;
  
  try {
    await ensureDb();
    
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get('saleId') || searchParams.get('orderId') || searchParams.get('order_number');

    if (!saleId) {
      return NextResponse.redirect(`${originUrl}/dashboard?status=error&error=MissingSaleId`);
    }

    // Retrieve sale records from database
    const saleRes = await db.execute({
      sql: 'SELECT user_id, status, sofizpay_id FROM sales WHERE id = ?',
      args: [saleId]
    });

    if (saleRes.rows.length === 0) {
      return NextResponse.redirect(`${originUrl}/dashboard?status=error&error=SaleNotFound`);
    }

    const { user_id: userId, status, sofizpay_id: cibTransactionId } = saleRes.rows[0];

    // If sale already marked completed, redirect to success
    if (status === 'completed') {
      return NextResponse.redirect(`${originUrl}/dashboard?status=success&sale_id=${saleId}`);
    }

    // Check if it's a simulated payment
    if (!cibTransactionId || cibTransactionId.startsWith('mock_tx_')) {
      if (status === 'completed') {
        return NextResponse.redirect(`${originUrl}/dashboard?status=success&sale_id=${saleId}`);
      } else {
        return NextResponse.redirect(`${originUrl}/dashboard?status=pending&sale_id=${saleId}`);
      }
    }

    // Verify status using direct call to check CIB status endpoint
    try {
      const checkUrl = `https://sofizpay.com/cib-transaction-check/?order_number=${cibTransactionId}`;
      console.log('Checking CIB transaction status directly:', checkUrl);
      
      const checkRes = await fetch(checkUrl);
      if (!checkRes.ok) {
        throw new Error(`SofizPay Check API returned HTTP status ${checkRes.status}`);
      }
      
      const responseData = await checkRes.json();
      const dataObj = responseData.data || responseData;
      
      const orderStatus = (dataObj.orderStatus !== undefined && dataObj.orderStatus !== null) ? Number(dataObj.orderStatus) : null;
      const respCode = (dataObj.respCode !== undefined && dataObj.respCode !== null) ? String(dataObj.respCode) : null;
      const errorMessage = dataObj.errorMessage;
      const rawStatus = dataObj.status;
      
      let paymentStatus = 'PENDING';
      
      // 1. Success conditions: orderStatus 2 (captured) or respCode "00"/"0" (approved) or status "success"
      if (orderStatus === 2 || respCode === '00' || respCode === '0' || String(rawStatus).toLowerCase() === 'success') {
        paymentStatus = 'PAID';
      }
      // 2. Failure conditions: orderStatus 3 (canceled) or 6 (rejected), or any non-success respCode, or status "fail"/"failed"
      else if (
        orderStatus === 3 || 
        orderStatus === 6 || 
        (respCode && respCode !== '00' && respCode !== '0') ||
        (errorMessage && String(errorMessage).toLowerCase().includes('rejected')) ||
        String(rawStatus).toLowerCase() === 'fail' ||
        String(rawStatus).toLowerCase() === 'failed'
      ) {
        paymentStatus = 'FAILED';
      }

      if (paymentStatus === 'PAID') {
        await completeSale(saleId, userId);
        return NextResponse.redirect(`${originUrl}/dashboard?status=success&sale_id=${saleId}`);
      } else if (paymentStatus === 'FAILED') {
        await db.execute({
          sql: 'UPDATE sales SET status = ? WHERE id = ? AND user_id = ?',
          args: ['failed', saleId, userId]
        });
        return NextResponse.redirect(`${originUrl}/dashboard?status=failed&sale_id=${saleId}`);
      }
    } catch (checkErr) {
      console.error('SofizPay direct check status verification failed:', checkErr);
    }

    // Fallback: redirect back showing pending status
    return NextResponse.redirect(`${originUrl}/dashboard?status=pending&sale_id=${saleId}`);

  } catch (error) {
    console.error('CIB Payments callback error:', error);
    return NextResponse.redirect(`${originUrl}/dashboard?status=error&error=${encodeURIComponent(error.message)}`);
  }
}
