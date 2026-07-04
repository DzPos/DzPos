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
    const saleId = searchParams.get('saleId');

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
      // For mock transactions, check current DB status (since status will be updated by simulator submit)
      if (status === 'completed') {
        return NextResponse.redirect(`${originUrl}/dashboard?status=success&sale_id=${saleId}`);
      } else {
        return NextResponse.redirect(`${originUrl}/dashboard?status=pending&sale_id=${saleId}`);
      }
    }

    // Verify status using direct call to check CIB status endpoint
    try {
      const checkUrl = `https://sofizpay.com/cib-transaction-check/?order_number=${cibTransactionId}`;
      console.log('Verifying CIB transaction status directly:', checkUrl);
      
      const checkRes = await fetch(checkUrl);
      if (!checkRes.ok) {
        throw new Error(`SofizPay Check API returned HTTP status ${checkRes.status}`);
      }
      
      const response = await checkRes.json();
      const dataObj = response.data || response;
      
      if (dataObj) {
        const orderStatus = (dataObj.orderStatus !== undefined && dataObj.orderStatus !== null) ? Number(dataObj.orderStatus) : null;
        const respCode = (dataObj.respCode !== undefined && dataObj.respCode !== null) ? String(dataObj.respCode) : null;
        const errorMessage = dataObj.errorMessage;
        
        let paymentStatus = 'PENDING';
        
        // 1. Success conditions: orderStatus 2 (captured) or respCode "00"/"0" (approved)
        if (orderStatus === 2 || respCode === '00' || respCode === '0') {
          paymentStatus = 'PAID';
        }
        // 2. Failure conditions: orderStatus 3 (canceled) or 6 (rejected), or any non-success respCode
        else if (
          orderStatus === 3 || 
          orderStatus === 6 || 
          (respCode && respCode !== '00' && respCode !== '0') ||
          (errorMessage && String(errorMessage).toLowerCase().includes('rejected'))
        ) {
          paymentStatus = 'FAILED';
        }
        // 3. Fallback to status property if present
        else {
          const rawStatus = dataObj.status;
          if (String(rawStatus).toLowerCase() === 'success') {
            paymentStatus = 'PAID';
          } else if (String(rawStatus).toLowerCase() === 'fail' || String(rawStatus).toLowerCase() === 'failed') {
            paymentStatus = 'FAILED';
          }
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
      }
    } catch (checkErr) {
      console.error('SofizPay direct CIB status verification failed:', checkErr);
    }

    // Fallback: redirect back showing pending status so polling can continue
    return NextResponse.redirect(`${originUrl}/dashboard?status=pending&sale_id=${saleId}`);

  } catch (error) {
    console.error('Payments callback error:', error);
    return NextResponse.redirect(`${originUrl}/dashboard?status=error&error=${encodeURIComponent(error.message)}`);
  }
}
