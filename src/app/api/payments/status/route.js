import { db, initDb, completeSale } from '@/lib/db';
import { NextResponse } from 'next/server';
import SofizPaySDK from 'sofizpay-sdk-js';


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
    const cibId = searchParams.get('cibId');
    const saleId = searchParams.get('saleId');
    const isSandbox = searchParams.get('isSandbox') !== 'false';

    if (!cibId || !saleId) {
      return NextResponse.json({ success: false, error: 'Missing cibId or saleId parameters' }, { status: 400 });
    }

    // Fetch sale from db scoped to this user
    const saleRes = await db.execute({
      sql: 'SELECT status, total_amount, amount_paid, payment_method FROM sales WHERE id = ? AND user_id = ?',
      args: [saleId, userId]
    });

    if (saleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
    }

    const sale = saleRes.rows[0];
    const currentStatus = sale.status;
    const amountToVerify = sale.amount_paid !== null && sale.amount_paid !== undefined ? sale.amount_paid : sale.total_amount;
    const paymentMethod = sale.payment_method;

    if (currentStatus === 'completed') {
      return NextResponse.json({ success: true, status: 'success' });
    }


    // If payment method is 'cib' (CIB QR — hosted bank page URL), check via cib-transaction-check directly
    if (paymentMethod === 'cib') {
      try {
        const checkUrl = `https://sofizpay.com/cib-transaction-check/?order_number=${cibId}`;
        console.log('Polling CIB QR transaction status:', checkUrl);
        
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
          const rawStatus = dataObj.status;
          
          let cibStatus = 'PENDING';
          
          if (orderStatus === 2 || respCode === '00' || respCode === '0' || String(rawStatus).toLowerCase() === 'success') {
            cibStatus = 'PAID';
          } else if (
            orderStatus === 3 ||
            orderStatus === 6 ||
            (respCode && respCode !== '00' && respCode !== '0') ||
            (errorMessage && String(errorMessage).toLowerCase().includes('rejected')) ||
            String(rawStatus).toLowerCase() === 'fail' ||
            String(rawStatus).toLowerCase() === 'failed'
          ) {
            cibStatus = 'FAILED';
          }

          if (cibStatus === 'PAID') {
            await completeSale(saleId, userId);
            return NextResponse.json({ success: true, status: 'success' });
          } else if (cibStatus === 'FAILED') {
            await db.execute({
              sql: 'UPDATE sales SET status = ? WHERE id = ? AND user_id = ?',
              args: ['failed', saleId, userId]
            });
            return NextResponse.json({ success: true, status: 'failed' });
          }
        }
        return NextResponse.json({ success: true, status: 'pending' });
      } catch (cibErr) {
        console.error('CIB QR status check failed:', cibErr);
        return NextResponse.json({ success: true, status: currentStatus });
      }
    }

    // If payment method is sofizpay (QR scan Stellar payment), check via SDK history
    if (paymentMethod === 'sofizpay') {
      try {
        const merchantRes = await db.execute({
          sql: 'SELECT sofizpay_key FROM users WHERE id = ?',
          args: [userId]
        });
        const publicKey = merchantRes.rows[0]?.sofizpay_key;

        if (publicKey && publicKey !== 'G_MOCK_ACCOUNT') {
          let numericTxId = cibId || '0';
          if (typeof numericTxId === 'string' && isNaN(numericTxId)) {
            const digits = numericTxId.replace(/[^0-9]/g, '');
            if (digits.length > 0) {
              numericTxId = digits;
            } else {
              let hash = 0;
              for (let i = 0; i < numericTxId.length; i++) {
                hash = (hash << 5) - hash + numericTxId.charCodeAt(i);
                hash |= 0;
              }
              numericTxId = Math.abs(hash).toString();
            }
          }

          console.log(`Checking transaction history via SofizPay SDK for ${publicKey} searching for transaction ID: ${numericTxId}`);
          const sdk = new SofizPaySDK();
          const historyRes = await sdk.getTransactions(publicKey, 5);

          let transactionsList = [];
          if (historyRes.success && historyRes.transactions) {
            transactionsList = historyRes.transactions.slice(0, 5);
            let actualPaidAmount = 0;
            let matchedTx = null;

            // Find the transaction matching this sale's CIB transaction ID via memo pattern: {anything}*{numericTxId}*169
            for (const tx of transactionsList) {
              if (!tx.memo) continue;
              const parts = tx.memo.split('*');
              if (parts.length === 3 && parts[1] === numericTxId && parts[2] === '169') {
                // The REAL paid amount is tx.amount (the actual Stellar transfer amount), NOT parts[0]
                // parts[0] is just the QR-requested amount encoded by the merchant
                actualPaidAmount = parseFloat(tx.amount || 0);
                matchedTx = tx;
                console.log(`Stellar tx matched by memo. tx.amount (actual paid): ${actualPaidAmount} DZD / DZT, totalSaleAmount: ${amountToVerify} DZD`);
                break;
              }
            }

            if (matchedTx) {
              const saleTotal = parseFloat(sale.total_amount);
              const debt = Math.max(0, saleTotal - actualPaidAmount);
              console.log(`Completing sale. Paid: ${actualPaidAmount}, Total: ${saleTotal}, Debt: ${debt}`);
              await completeSale(saleId, userId, actualPaidAmount);
              return NextResponse.json({ 
                success: true, 
                status: 'success',
                actualPaidAmount,
                debtAmount: debt,
                transactions: transactionsList 
              });
            }
          }

          // Return pending but include last 5 transactions in response
          return NextResponse.json({ 
            success: true, 
            status: 'pending', 
            transactions: transactionsList 
          });
        }
      } catch (sdkErr) {
        console.error('SofizPay SDK getTransactions status check failed:', sdkErr);
      }
    }

    // If it's a mock transaction and not found on blockchain, return the current DB status
    if (cibId.startsWith('mock_tx_')) {
      return NextResponse.json({ success: true, status: currentStatus });
    }

    // For real transactions, query SofizPay gateway directly via fetch
    try {
      const checkUrl = `https://sofizpay.com/cib-transaction-check/?order_number=${cibId}`;
      console.log('Polling CIB transaction status directly:', checkUrl);
      
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
        
        let status = 'PENDING';
        
        // 1. Success conditions: orderStatus 2 (captured) or respCode "00"/"0" (approved)
        if (orderStatus === 2 || respCode === '00' || respCode === '0') {
          status = 'PAID';
        }
        // 2. Failure conditions: orderStatus 3 (canceled) or 6 (rejected), or any non-success respCode
        else if (
          orderStatus === 3 || 
          orderStatus === 6 || 
          (respCode && respCode !== '00' && respCode !== '0') ||
          (errorMessage && String(errorMessage).toLowerCase().includes('rejected'))
        ) {
          status = 'FAILED';
        }
        // 3. Fallback to status property if present
        else {
          const rawStatus = dataObj.status;
          if (String(rawStatus).toLowerCase() === 'success') {
            status = 'PAID';
          } else if (String(rawStatus).toLowerCase() === 'fail' || String(rawStatus).toLowerCase() === 'failed') {
            status = 'FAILED';
          }
        }

        if (status === 'PAID') {
          await completeSale(saleId, userId);
          return NextResponse.json({ success: true, status: 'success' });
        } else if (status === 'FAILED') {
          await db.execute({
            sql: 'UPDATE sales SET status = ? WHERE id = ? AND user_id = ?',
            args: ['failed', saleId, userId]
          });
          return NextResponse.json({ success: true, status: 'failed' });
        }
      }
      
      return NextResponse.json({ success: true, status: 'pending' });
    } catch (sdkErr) {
      console.error('SofizPay direct CIB status check failed:', sdkErr);
    }

    return NextResponse.json({ success: true, status: currentStatus });

  } catch (error) {
    console.error('Payments status API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST endpoint for the payment simulator to mark a mock transaction as completed/paid
export async function POST(req) {
  try {
    await ensureDb();
    
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Missing x-user-id header' }, { status: 401 });
    }

    const body = await req.json();
    const { cibId, saleId, status } = body;

    if (!cibId || !saleId || !status) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch sale from db scoped to this user
    const saleRes = await db.execute({
      sql: 'SELECT status FROM sales WHERE id = ? AND user_id = ?',
      args: [saleId, userId]
    });

    if (saleRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
    }

    const currentStatus = saleRes.rows[0].status;

    if (currentStatus === 'completed') {
      return NextResponse.json({ success: true, message: 'Sale already completed' });
    }

    if (status === 'success') {
      await completeSale(saleId, userId);
      return NextResponse.json({ success: true, message: 'Mock payment simulator succeeded, sale completed' });
    } else if (status === 'failed') {
      await db.execute({
        sql: 'UPDATE sales SET status = ? WHERE id = ? AND user_id = ?',
        args: ['failed', saleId, userId]
      });
      return NextResponse.json({ success: true, message: 'Mock payment simulator failed' });
    }

    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });

  } catch (error) {
    console.error('Payments status POST API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
