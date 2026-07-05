"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Store, Archive, BarChart3, Settings, Search, Plus, Edit, Trash2, 
  Printer, RefreshCw, CreditCard, Wallet, QrCode, AlertTriangle, CheckCircle2, 
  User, Phone, Mail, FileText, X, ChevronRight, Ban
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';

export default function DzPos() {
  const router = useRouter();
  const [merchant, setMerchant] = useState(null);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'inventory' | 'reports' | 'settings'
  
  // Shop details configuration (persisted to localStorage)
  const [shopDetails, setShopDetails] = useState({
    name: 'DzPos Café & Sweets',
    address: '12 Rue Didouche Mourad, Alger',
    phone: '+213 21 00 00 00',
    vatRate: 19, // Algerian VAT is typically 19%
    currency: 'DZD'
  });

  // SofizPay configuration (persisted to localStorage)
  const [sofizpayConfig, setSofizpayConfig] = useState({
    account: 'G_MOCK_ACCOUNT',
    isSandbox: true
  });

  // Products and Catalog state
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Cart state
  const [cart, setCart] = useState([]);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState('cash'); // 'cash' | 'card' | 'sofizpay'
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // SofizPay payment processing state
  const [isSofizPayOpen, setIsSofizPayOpen] = useState(false);
  const [sofizPayDetails, setSofizPayDetails] = useState(null); // { saleId, cibTransactionId, paymentUrl, isMock }
  const [sofizPayStatus, setSofizPayStatus] = useState('pending'); // 'pending' | 'success' | 'failed'
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const pollingTimerRef = useRef(null);

  // CIB QR payment processing state
  const [isCibQrOpen, setIsCibQrOpen] = useState(false);
  const [cibQrDetails, setCibQrDetails] = useState(null); // { saleId, cibTransactionId, paymentUrl, isMock, amount }
  const [cibQrStatus, setCibQrStatus] = useState('pending'); // 'pending' | 'success' | 'failed'
  const [isCibPolling, setIsCibPolling] = useState(false);
  const cibPollingTimerRef = useRef(null);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null); // { sale, items }

  // Inventory forms state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormMode, setProductFormMode] = useState('create'); // 'create' | 'edit'
  const [productForm, setProductForm] = useState({
    id: '',
    sku: '',
    name: '',
    price: '',
    stock: '',
    category: 'Beverages'
  });

  // Reports state
  const [reportsData, setReportsData] = useState({
    stats: { totalSales: 0, transactionCount: 0, breakdown: { cash: 0, card: 0, sofizpay: 0 } },
    salesHistory: [],
    eodReports: []
  });
  const [selectedReportDate, setSelectedReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeEodReport, setActiveEodReport] = useState(null);

  // Debts state
  const [debts, setDebts] = useState([]);
  const [searchDebtQuery, setSearchDebtQuery] = useState('');
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('cash'); // 'cash' | 'sofizpay'
  const [isSettleLoading, setIsSettleLoading] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedDebtHistory, setSelectedDebtHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [amountPaidInput, setAmountPaidInput] = useState('');

  const fetchDebts = async () => {
    if (!merchant?.id) return;
    try {
      const res = await fetch('/api/debts', {
        headers: { 'x-user-id': merchant.id }
      });
      const data = await res.json();
      if (data.success) {
        setDebts(data.debts);
      }
    } catch (err) {
      console.error('Failed to fetch debts:', err);
    }
  };

  const handleSettleDebt = async (e) => {
    e.preventDefault();
    if (!selectedDebt || !settleAmount || parseFloat(settleAmount) <= 0) return;
    if (parseFloat(settleAmount) > selectedDebt.remaining_amount) {
      alert('مبلغ التسديد يتجاوز الدين المتبقي.\nSettle amount exceeds remaining debt.');
      return;
    }

    setIsSettleLoading(true);
    try {
      const res = await fetch(`/api/debts/${selectedDebt.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({
          amount: parseFloat(settleAmount),
          paymentMethod: settleMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsSettleModalOpen(false);
        setSettleAmount('');
        await fetchDebts();
        alert('تم تسجيل الدفعة بنجاح.\nPayment recorded successfully.');
      } else {
        alert('فشل تسجيل الدفعة: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to settle debt:', err);
      alert('خطأ في الاتصال.\nNetwork error.');
    } finally {
      setIsSettleLoading(false);
    }
  };

  const handleViewHistory = async (debt) => {
    setSelectedDebt(debt);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/debts/${debt.id}/payments`, {
        headers: { 'x-user-id': merchant.id }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDebtHistory(data.payments);
      } else {
        alert('فشل تحميل سجل المدفوعات: ' + data.error);
      }
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'debts') {
      fetchDebts();
    }
  }, [activeTab, merchant]);

  // Categories list
  const categories = ['All', 'Beverages', 'Food', 'Bakery', 'Others'];

  // --- Initialization & Persistance ---
  useEffect(() => {
    // Check authentication
    const savedMerchant = localStorage.getItem('dzpos_merchant');
    if (!savedMerchant) {
      router.push('/login');
      return;
    }

    const merchantObj = JSON.parse(savedMerchant);
    setMerchant(merchantObj);

    // Load config from localstorage if available
    const savedShop = localStorage.getItem('dzpos_shop');
    if (savedShop) {
      const shopObj = JSON.parse(savedShop);
      setShopDetails({ ...shopObj, name: merchantObj.shopName || shopObj.name });
    } else {
      setShopDetails(prev => ({ ...prev, name: merchantObj.shopName || prev.name }));
    }

    const savedSofiz = localStorage.getItem('dzpos_sofiz');
    if (savedSofiz) {
      setSofizpayConfig(JSON.parse(savedSofiz));
    } else {
      setSofizpayConfig({
        account: merchantObj.sofizpayKey || 'G_MOCK_ACCOUNT',
        isSandbox: true
      });
    }

    // Fetch initial products and stats scoped to the logged-in merchant ID
    fetchProducts(merchantObj.id);
    fetchReports(merchantObj.id);
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, selectedReportDate]);

  // Handle saving configurations
  const saveShopConfig = async (newShop) => {
    if (!merchant?.id) return;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({
          shopName: newShop.name,
          sofizpayKey: sofizpayConfig.account
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update session in localstorage
        const updatedMerchant = { ...merchant, shopName: newShop.name, sofizpayKey: sofizpayConfig.account };
        setMerchant(updatedMerchant);
        localStorage.setItem('dzpos_merchant', JSON.stringify(updatedMerchant));

        // Save local configuration
        setShopDetails(newShop);
        localStorage.setItem('dzpos_shop', JSON.stringify(newShop));
        alert('Shop configurations saved to server database successfully!');
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (err) {
      console.error('Save shop config error:', err);
      alert('Error updating shop settings.');
    }
  };

  const saveSofizConfig = async (newSofiz) => {
    if (!merchant?.id) return;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({
          shopName: shopDetails.name,
          sofizpayKey: newSofiz.account
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update session in localstorage
        const updatedMerchant = { ...merchant, shopName: shopDetails.name, sofizpayKey: newSofiz.account };
        setMerchant(updatedMerchant);
        localStorage.setItem('dzpos_merchant', JSON.stringify(updatedMerchant));

        // Save local configuration
        setSofizpayConfig(newSofiz);
        localStorage.setItem('dzpos_sofiz', JSON.stringify(newSofiz));
        alert('SofizPay integration configurations saved to server database successfully!');
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (err) {
      console.error('Save config error:', err);
      alert('Error updating profile settings.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dzpos_merchant');
    router.push('/');
  };

  // --- API Integrations ---

  // Fetch all products scoped to this merchant
  const fetchProducts = async (merchantId) => {
    const id = merchantId || merchant?.id;
    if (!id) return;
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/products', {
        headers: { 'x-user-id': id }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      } else {
        console.error('Failed to load products:', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch reports data scoped to this merchant
  const fetchReports = async (merchantId) => {
    const id = merchantId || merchant?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/reports?date=${selectedReportDate}`, {
        headers: { 'x-user-id': id }
      });
      const data = await res.json();
      if (data.success) {
        setReportsData({
          stats: data.stats,
          salesHistory: data.salesHistory,
          eodReports: data.eodReports
        });
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  // Run seed data
  const runSeeding = async (reset = false) => {
    if (!merchant?.id) return;
    if (reset && !confirm('Are you sure you want to delete all current inventory, sales, and reports? This action is irreversible.')) {
      return;
    }
    
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({ mode: reset ? 'reset' : 'seed' })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchProducts();
        fetchReports();
      } else {
        alert('Seeding failed: ' + data.error);
      }
    } catch (err) {
      console.error('Seeding error:', err);
      alert('Error running seed script.');
    }
  };

  // Fetch receipt details
  const loadReceipt = async (saleId) => {
    if (!merchant?.id) return;
    try {
      const res = await fetch(`/api/reports?saleId=${saleId}`, {
        headers: { 'x-user-id': merchant.id }
      });
      const data = await res.json();
      if (data.success) {
        setCurrentReceipt({
          sale: data.sale,
          items: data.items
        });
        setIsReceiptOpen(true);
      }
    } catch (err) {
      console.error('Error loading receipt:', err);
    }
  };

  // --- Cart Actions ---
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert('This product is out of stock!');
      return;
    }
    
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Only ${product.stock} items are in stock.`);
          return prevCart;
        }
        return prevCart.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId, change) => {
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.id === productId);
      const product = products.find((p) => p.id === productId);
      
      if (!item) return prevCart;
      
      const newQty = item.quantity + change;
      if (newQty <= 0) {
        return prevCart.filter((i) => i.id !== productId);
      }
      
      if (product && newQty > product.stock) {
        alert(`Cannot set quantity to ${newQty}. Only ${product.stock} items are in stock.`);
        return prevCart;
      }
      
      return prevCart.map((i) => 
        i.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const clearCart = () => setCart([]);

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * (shopDetails.vatRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  // --- Checkout Operations ---
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
    const { total } = getCartTotals();
    setAmountPaidInput(total.toFixed(2));
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    const { total } = getCartTotals();

    // For SofizPay: amountPaid = full total (actual paid amount determined from Stellar memo automatically)
    // For Cash: amountPaid = what the merchant entered manually
    const isSofizPay = checkoutMethod === 'sofizpay';
    const amountPaidVal = isSofizPay ? total : parseFloat(amountPaidInput !== '' ? amountPaidInput : total);

    if (!isSofizPay) {
      if (isNaN(amountPaidVal) || amountPaidVal < 0 || amountPaidVal > total) {
        alert('المبلغ المدفوع غير صالح.\nInvalid amount paid.');
        return;
      }
      if (amountPaidVal < total && !customerDetails.name.trim()) {
        alert('اسم الزبون مطلوب لتسجيل المعاملة كدين.\nCustomer Name is required to record outstanding debt.');
        return;
      }
    }
    
    const checkoutPayload = {
      paymentMethod: checkoutMethod,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: total,
      amountPaid: amountPaidVal,
      customer: customerDetails,
      sofizpayConfig
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify(checkoutPayload)
      });
      const data = await res.json();
      
      if (data.success) {
        setIsCheckoutOpen(false);
        
        if (checkoutMethod === 'card' && amountPaidVal > 0) {
          // Redirect directly to SofizPay CIB payment page
          window.location.href = data.paymentUrl;
        } else if (checkoutMethod === 'cib' && amountPaidVal > 0) {
          // Open CIB QR Modal — show the paymentUrl as a scannable QR code
          setCibQrDetails(data);
          setCibQrStatus('pending');
          setIsCibQrOpen(true);
          startPollingCibPayment(data.cibTransactionId, data.saleId);
        } else if (checkoutMethod === 'sofizpay' && amountPaidVal > 0) {
          // Open SofizPay QR Modal for mobile scanning
          setSofizPayDetails(data);
          setSofizPayStatus('pending');
          setIsSofizPayOpen(true);
          startPollingPayment(data.cibTransactionId, data.saleId);
        } else {
          // Cash completed immediately, or 100% debt checkout
          clearCart();
          fetchProducts(); // Refresh stock
          // Load receipt
          await loadReceipt(data.saleId);
        }
      } else {
        alert('Checkout failed: ' + data.error);
      }
    } catch (err) {
      console.error('Checkout submit error:', err);
      alert('Network error during checkout.');
    }
  };

  // --- SofizPay Polling & Simulation ---
  const startPollingPayment = (cibId, saleId) => {
    if (!merchant?.id) return;
    if (isPollingStatus) return;
    
    setIsPollingStatus(true);
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status?cibId=${cibId}&saleId=${saleId}&isSandbox=${sofizpayConfig.isSandbox}`, {
          headers: { 'x-user-id': merchant.id }
        });
        const statusData = await res.json();
        
        if (statusData.success) {
          if (statusData.status === 'success') {
            setSofizPayStatus('success');
            setIsPollingStatus(false);
            clearInterval(pollingTimerRef.current);
            // Delay closing QR to show completion message
            setTimeout(() => {
              setIsSofizPayOpen(false);
              clearCart();
              fetchProducts(); // Refresh stock
              loadReceipt(saleId); // Load completed receipt
            }, 2000);
          } else if (statusData.status === 'failed') {
            setSofizPayStatus('failed');
            setIsPollingStatus(false);
            clearInterval(pollingTimerRef.current);
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    };

    // Poll every 3 seconds
    checkStatus();
    pollingTimerRef.current = setInterval(checkStatus, 3000);
  };

  const stopPolling = () => {
    setIsPollingStatus(false);
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
  };

  const handleCloseSofizPayModal = () => {
    stopPolling();
    setIsSofizPayOpen(false);
  };

  // --- CIB QR Polling ---
  const startPollingCibPayment = (cibId, saleId) => {
    if (!merchant?.id) return;
    if (isCibPolling) return;

    setIsCibPolling(true);
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status?cibId=${cibId}&saleId=${saleId}&isSandbox=${sofizpayConfig.isSandbox}`, {
          headers: { 'x-user-id': merchant.id }
        });
        const statusData = await res.json();

        if (statusData.success) {
          if (statusData.status === 'success') {
            setCibQrStatus('success');
            setIsCibPolling(false);
            clearInterval(cibPollingTimerRef.current);
            setTimeout(() => {
              setIsCibQrOpen(false);
              clearCart();
              fetchProducts();
              loadReceipt(saleId);
            }, 2000);
          } else if (statusData.status === 'failed') {
            setCibQrStatus('failed');
            setIsCibPolling(false);
            clearInterval(cibPollingTimerRef.current);
          }
        }
      } catch (err) {
        console.error('Error polling CIB QR payment status:', err);
      }
    };

    checkStatus();
    cibPollingTimerRef.current = setInterval(checkStatus, 3000);
  };

  const stopCibPolling = () => {
    setIsCibPolling(false);
    if (cibPollingTimerRef.current) {
      clearInterval(cibPollingTimerRef.current);
    }
  };

  const handleCloseCibQrModal = () => {
    stopCibPolling();
    setIsCibQrOpen(false);
  };

  // Simulator helper to trigger complete payment on mock transaction
  const simulatePaymentSuccess = async (cibId, saleId, isSuccess) => {
    if (!merchant?.id) return;
    try {
      const res = await fetch('/api/payments/status', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({
          cibId,
          saleId,
          status: isSuccess ? 'success' : 'failed'
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Simulator update failed: ' + data.error);
      }
    } catch (err) {
      console.error('Simulator action error:', err);
    }
  };

  // --- Inventory CRUD Operations ---
  const handleOpenAddProduct = () => {
    setProductFormMode('create');
    setProductForm({
      id: '',
      sku: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      price: '',
      stock: '',
      category: 'Beverages'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setProductFormMode('edit');
    setProductForm({
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      category: prod.category
    });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      action: productFormMode === 'create' ? 'create' : 'update',
      id: productForm.id,
      sku: productForm.sku,
      name: productForm.name,
      price: parseFloat(productForm.price),
      stock: parseInt(productForm.stock),
      category: productForm.category
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsProductModalOpen(false);
        fetchProducts();
        alert(`Product ${productFormMode === 'create' ? 'created' : 'updated'} successfully!`);
      } else {
        alert('Operation failed: ' + data.error);
      }
    } catch (err) {
      console.error('Product submit error:', err);
      alert('Error submitting product form.');
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!merchant?.id) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({ action: 'delete', id: prodId })
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
        alert('Product deleted successfully.');
      } else {
        alert('Deletion failed: ' + data.error);
      }
    } catch (err) {
      console.error('Delete product error:', err);
    }
  };

  // --- Reports & EOD Generator ---
  const handleGenerateEod = async () => {
    if (!merchant?.id) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': merchant.id
        },
        body: JSON.stringify({ date: selectedReportDate })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActiveEodReport(data.report);
        fetchReports();
      } else {
        alert('EOD failed: ' + data.error);
      }
    } catch (err) {
      console.error('Generate EOD error:', err);
    }
  };

  // --- Print Utilities ---
  const handlePrint = (elementId) => {
    const printContent = document.getElementById(elementId).innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create print window style overlay
    document.body.innerHTML = `
      <div style="display:flex; justify-content:center; padding: 40px; background:white; color:black;">
        ${printContent}
      </div>
    `;
    window.print();
    // Restore original window
    document.body.innerHTML = originalContent;
    // Reload page to re-bind React states
    window.location.reload();
  };

  // --- Filters ---
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || prod.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span className="brand-logo"><ShoppingBag size={26} /></span>
            <span className="brand-name">DzPos</span>
          </div>
          
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              <Store size={18} />
              <span>Register</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Archive size={18} />
              <span>Inventory</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <BarChart3 size={18} />
              <span>Reports & EOD</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`}
              onClick={() => setActiveTab('debts')}
            >
              <FileText size={18} />
              <span>Debts / الديون</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="shop-status" style={{ marginBottom: '8px' }}>
            <div className="status-indicator"></div>
            <span>{shopDetails.name}</span>
          </div>
          <button 
            className="nav-item" 
            style={{ 
              padding: '8px 12px', 
              fontSize: '13px', 
              color: 'var(--danger)', 
              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
              border: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: 'var(--radius-sm)'
            }}
            onClick={handleLogout}
          >
            <X size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="main-workspace">
        {/* HEADER BAR */}
        <header className="header">
          <h1 className="page-title">
            {activeTab === 'register' && 'POS Terminal'}
            {activeTab === 'inventory' && 'Inventory Basics'}
            {activeTab === 'reports' && 'EOD Reports & Analytics'}
            {activeTab === 'debts' && 'Debts Ledger / سجل الديون'}
            {activeTab === 'settings' && 'System Configuration'}
          </h1>
          <div className="header-actions">
            <span>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <div className="workspace-content">
          
          {/* TAB 1: POS REGISTER */}
          {activeTab === 'register' && (
            <div className="pos-layout">
              {/* Product catalog panel */}
              <div className="catalog-panel">
                {/* Search Bar */}
                <div className="search-bar">
                  <div className="search-input-wrapper">
                    <Search className="search-input-icon" size={18} />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search product by name or SKU..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchQuery && (
                    <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>Clear</button>
                  )}
                </div>

                {/* Category tabs */}
                <div className="category-tabs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Catalog Grid */}
                {isLoadingProducts ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <RefreshCw className="pulse-loader" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ marginLeft: '12px' }}>Loading catalog...</span>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                    <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p>No products found matching filters.</p>
                    <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => runSeeding(false)}>
                      Load Sample Catalog
                    </button>
                  </div>
                ) : (
                  <div className="products-grid">
                    {filteredProducts.map((prod) => (
                      <div 
                        key={prod.id} 
                        className="product-card"
                        onClick={() => addToCart(prod)}
                      >
                        {prod.stock <= 5 && (
                          <span className={`product-badge ${prod.stock === 0 ? 'out-of-stock' : ''}`}>
                            {prod.stock === 0 ? 'Out of stock' : `Low Stock: ${prod.stock}`}
                          </span>
                        )}
                        <div className="product-info">
                          <span className="product-cat">{prod.category}</span>
                          <span className="product-name">{prod.name}</span>
                        </div>
                        <div className="product-footer">
                          <span className="product-price">{prod.price} {shopDetails.currency}</span>
                          <span className="product-stock">Stock: {prod.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right cart details panel */}
              <div className="cart-sidebar">
                <div className="cart-header">
                  <h2 className="cart-title">
                    <ShoppingBag size={20} />
                    <span>Cart</span>
                    {cart.length > 0 && <span className="cart-items-count">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>}
                  </h2>
                  {cart.length > 0 && (
                    <button className="clear-cart-btn" onClick={clearCart}>Clear All</button>
                  )}
                </div>

                <div className="cart-items-list">
                  {cart.length === 0 ? (
                    <div className="empty-cart-state">
                      <ShoppingBag className="empty-cart-icon" size={48} />
                      <p>Select products on the left to start checking out.</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-details">
                          <span className="cart-item-name">{item.name}</span>
                          <span className="cart-item-price">{item.price} {shopDetails.currency}</span>
                        </div>
                        <div className="cart-item-quantity-control">
                          <button className="qty-btn" onClick={() => updateCartQty(item.id, -1)}>-</button>
                          <span className="qty-val">{item.quantity}</span>
                          <button className="qty-btn" onClick={() => updateCartQty(item.id, 1)}>+</button>
                        </div>
                        <span className="cart-item-total">
                          {(item.price * item.quantity).toFixed(2)} {shopDetails.currency}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>{getCartTotals().subtotal.toFixed(2)} {shopDetails.currency}</span>
                    </div>
                    <div className="summary-row">
                      <span>VAT ({shopDetails.vatRate}%)</span>
                      <span>{getCartTotals().tax.toFixed(2)} {shopDetails.currency}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total Amount</span>
                      <span className="summary-total-val">{getCartTotals().total.toFixed(2)} {shopDetails.currency}</span>
                    </div>

                    <button 
                      className="checkout-btn" 
                      onClick={handleProceedToCheckout}
                    >
                      <span>Proceed to Payment</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY BASICS */}
          {activeTab === 'inventory' && (
            <div>
              <div className="data-table-wrapper">
                <div className="table-header-bar">
                  <h2 className="table-title">Product Catalog</h2>
                  <button className="btn btn-primary" onClick={handleOpenAddProduct}>
                    <Plus size={16} />
                    <span>Add New Product</span>
                  </button>
                </div>
                
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock Qty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No products found in the catalog database. Click "Add New Product" or seed sample café items in Settings.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => (
                        <tr key={prod.id}>
                          <td><code>{prod.sku}</code></td>
                          <td style={{ fontWeight: 600 }}>{prod.name}</td>
                          <td>{prod.category}</td>
                          <td style={{ fontWeight: 600, color: 'var(--secondary)' }}>{prod.price.toFixed(2)} {shopDetails.currency}</td>
                          <td>{prod.stock}</td>
                          <td>
                            {prod.stock > 5 ? (
                              <span className="stock-indicator good">In Stock</span>
                            ) : prod.stock > 0 ? (
                              <span className="stock-indicator low">Low Stock</span>
                            ) : (
                              <span className="stock-indicator out">Out of Stock</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                onClick={() => handleOpenEditProduct(prod)}
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '6px 10px', fontSize: '12px' }}
                                onClick={() => handleDeleteProduct(prod.id)}
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REPORTS & EOD */}
          {activeTab === 'reports' && (
            <div>
              {/* Stats Cards */}
              <div className="grid-cols-4">
                <div className="stats-card">
                  <span className="stats-title">Today's Revenue</span>
                  <span className="stats-value">{reportsData.stats.totalSales.toFixed(2)} {shopDetails.currency}</span>
                  <span className="stats-subtitle">Target achieved for {reportsData.stats.date}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-title">Today's Transactions</span>
                  <span className="stats-value">{reportsData.stats.transactionCount}</span>
                  <span className="stats-subtitle">Completed checkouts</span>
                </div>
                <div className="stats-card card-success">
                  <span className="stats-title">Cash & Card Revenue</span>
                  <span className="stats-value">
                    {((reportsData.stats.breakdown.cash || 0) + (reportsData.stats.breakdown.card || 0)).toFixed(2)} {shopDetails.currency}
                  </span>
                  <span className="stats-subtitle">
                    Cash: {(reportsData.stats.breakdown.cash || 0).toFixed(0)} | Card: {(reportsData.stats.breakdown.card || 0).toFixed(0)}
                  </span>
                </div>
                <div className="stats-card card-warning">
                  <span className="stats-title">SofizPay Mobile Scanning</span>
                  <span className="stats-value">{(reportsData.stats.breakdown.sofizpay || 0).toFixed(2)} {shopDetails.currency}</span>
                  <span className="stats-subtitle">Processed via QR invoice code</span>
                </div>
              </div>

              {/* End of Day Generator & Reports Split */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                
                {/* Left Side: EOD Generator and Past EOD lists */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="settings-section">
                    <h3 className="settings-section-title">End-of-Day (EOD) Operations</h3>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">EOD Report Date</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          value={selectedReportDate} 
                          onChange={(e) => setSelectedReportDate(e.target.value)}
                        />
                      </div>
                      <button className="btn btn-primary" onClick={handleGenerateEod}>
                        <RefreshCw size={16} />
                        <span>Run & Compile EOD Report</span>
                      </button>
                    </div>
                  </div>

                  <div className="data-table-wrapper">
                    <div className="table-header-bar">
                      <h3 className="table-title">Past Generated EOD Summaries</h3>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Total Sales</th>
                          <th>Transactions</th>
                          <th>Cash Total</th>
                          <th>Card Total</th>
                          <th>SofizPay Total</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.eodReports.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                              No EOD reports archived. Click compile above to create one.
                            </td>
                          </tr>
                        ) : (
                          reportsData.eodReports.map((report) => (
                            <tr key={report.id}>
                              <td style={{ fontWeight: 700 }}>{report.report_date}</td>
                              <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{report.total_sales.toFixed(2)} {shopDetails.currency}</td>
                              <td>{report.transaction_count}</td>
                              <td>{report.cash_total.toFixed(2)}</td>
                              <td>{report.card_total.toFixed(2)}</td>
                              <td>{report.sofizpay_total.toFixed(2)}</td>
                              <td>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  onClick={() => setActiveEodReport(report)}
                                >
                                  <FileText size={12} />
                                  <span>View Report</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Side: EOD Printable Receipt Viewer */}
                {activeEodReport && (
                  <div style={{ width: '340px', flexShrink: 0, position: 'sticky', top: '16px' }}>
                    <div className="receipt-box" id="eod-receipt-print">
                      <div className="receipt-title">EOD REPORT</div>
                      <div className="receipt-subtitle">DzPos Audit</div>
                      <div className="receipt-divider"></div>
                      <div className="receipt-row">
                        <span>Report Date:</span>
                        <span style={{ fontWeight: 'bold' }}>{activeEodReport.report_date || activeEodReport.reportDate}</span>
                      </div>
                      <div className="receipt-row">
                        <span>Compiled At:</span>
                        <span>{new Date(activeEodReport.created_at || activeEodReport.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="receipt-divider"></div>
                      <div className="receipt-row">
                        <span>Transactions:</span>
                        <span>{activeEodReport.transaction_count || activeEodReport.transactionCount} completed</span>
                      </div>
                      <div className="receipt-divider"></div>
                      <div className="receipt-row" style={{ fontWeight: 'bold' }}>
                        <span>Cash Amount:</span>
                        <span>{(activeEodReport.cash_total || activeEodReport.cashTotal || 0).toFixed(2)} {shopDetails.currency}</span>
                      </div>
                      <div className="receipt-row" style={{ fontWeight: 'bold' }}>
                        <span>Card Amount:</span>
                        <span>{(activeEodReport.card_total || activeEodReport.cardTotal || 0).toFixed(2)} {shopDetails.currency}</span>
                      </div>
                      <div className="receipt-row" style={{ fontWeight: 'bold' }}>
                        <span>SofizPay Amount:</span>
                        <span>{(activeEodReport.sofizpay_total || activeEodReport.sofizpayTotal || 0).toFixed(2)} {shopDetails.currency}</span>
                      </div>
                      <div className="receipt-divider"></div>
                      <div className="receipt-row" style={{ fontSize: '15px', fontWeight: 'bold' }}>
                        <span>GRAND TOTAL:</span>
                        <span>{(activeEodReport.total_sales || activeEodReport.totalSales || 0).toFixed(2)} {shopDetails.currency}</span>
                      </div>
                      <div className="receipt-divider"></div>
                      <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <span>DZPOS METRIC ARCHIVE</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                      <button className="btn btn-primary" onClick={() => handlePrint('eod-receipt-print')}>
                        <Printer size={14} />
                        <span>Print Audit</span>
                      </button>
                      <button className="btn btn-secondary" onClick={() => setActiveEodReport(null)}>
                        <span>Close</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions log list */}
              <div className="data-table-wrapper" style={{ marginTop: '24px' }}>
                <div className="table-header-bar">
                  <h3 className="table-title">Recent Customer Invoices (Today)</h3>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Sale ID</th>
                      <th>Payment Method</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsData.salesHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No sales recorded in the system. Go to Register terminal to checkout.
                        </td>
                      </tr>
                    ) : (
                      reportsData.salesHistory.map((sale) => (
                        <tr key={sale.id}>
                          <td>{new Date(sale.created_at).toLocaleTimeString()}</td>
                          <td><code>{sale.id.substring(0, 8)}...</code></td>
                          <td style={{ textTransform: 'capitalize' }}>
                            {sale.payment_method === 'sofizpay' ? 'SofizPay QR' : sale.payment_method}
                          </td>
                          <td style={{ fontWeight: 600 }}>{sale.total_amount.toFixed(2)} {shopDetails.currency}</td>
                          <td>
                            <span className={`status-badge ${sale.status}`}>
                              {sale.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              onClick={() => loadReceipt(sale.id)}
                            >
                              <Printer size={12} />
                              <span>Print</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              {/* Profile Config */}
              <div className="settings-section">
                <h3 className="settings-section-title">Shop Profile Settings</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Shop Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={shopDetails.name}
                      onChange={(e) => setShopDetails({ ...shopDetails, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shop Telephone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={shopDetails.phone}
                      onChange={(e) => setShopDetails({ ...shopDetails, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Shop Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={shopDetails.address}
                      onChange={(e) => setShopDetails({ ...shopDetails, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Algerian VAT Rate (%)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={shopDetails.vatRate}
                      onChange={(e) => setShopDetails({ ...shopDetails, vatRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => saveShopConfig(shopDetails)}
                >
                  Save Profile Configuration
                </button>
              </div>

              {/* SofizPay Config */}
              <div className="settings-section">
                <h3 className="settings-section-title">SofizPay Mobile Integration (EDAHABIA/CIB QR Scanner)</h3>
                <div className="form-group">
                  <label className="form-label">Merchant Stellar Public Key (SofizPay Account)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter Stellar Public Key (starts with G)"
                    value={sofizpayConfig.account}
                    onChange={(e) => setSofizpayConfig({ ...sofizpayConfig, account: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                    * Use <code>G_MOCK_ACCOUNT</code> or keep sandbox key to run inside POS payment simulator mode.
                  </small>
                </div>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    id="sandboxCheckbox"
                    checked={sofizpayConfig.isSandbox}
                    onChange={(e) => setSofizpayConfig({ ...sofizpayConfig, isSandbox: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="sandboxCheckbox" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    Enable Sandbox Testing Environment
                  </label>
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={() => saveSofizConfig(sofizpayConfig)}
                >
                  Save SofizPay Settings
                </button>
              </div>

              {/* Data Utilities */}
              <div className="settings-section">
                <h3 className="settings-section-title">Database Seeding & Reset Utilities</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                  Seed sample data into your database, or clear transactions and initialize tables to clean-up.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-success" onClick={() => runSeeding(false)}>
                    Seed Sample Products (Algerian Sweets)
                  </button>
                  <button className="btn btn-danger" onClick={() => runSeeding(true)}>
                    Reset Database (Wipe All Records)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debts' && (
            <div>
              {/* KPIs */}
              <div className="grid-cols-4" style={{ marginBottom: '24px' }}>
                <div className="stats-card">
                  <span className="stats-title">Total Outstanding Debt / إجمالي الديون المعلقة</span>
                  <span className="stats-value" style={{ color: 'var(--alert-error, #ef4444)' }}>
                    {debts.reduce((sum, d) => sum + (d.status !== 'paid' ? d.remaining_amount : 0), 0).toFixed(2)} {shopDetails.currency}
                  </span>
                  <span className="stats-subtitle">Money owed by customers</span>
                </div>
                <div className="stats-card card-success">
                  <span className="stats-title">Active Debtors / المدينين النشطين</span>
                  <span className="stats-value">
                    {debts.filter(d => d.remaining_amount > 0).length}
                  </span>
                  <span className="stats-subtitle">Customers with unpaid balances</span>
                </div>
                <div className="stats-card card-warning">
                  <span className="stats-title">Total Debts / مجموع الديون المسجلة</span>
                  <span className="stats-value">
                    {debts.reduce((sum, d) => sum + d.debt_amount, 0).toFixed(2)} {shopDetails.currency}
                  </span>
                  <span className="stats-subtitle">All-time recorded debt</span>
                </div>
                <div className="stats-card">
                  <span className="stats-title">Collected / الديون المحصلة</span>
                  <span className="stats-value" style={{ color: 'var(--success-color, #10b981)' }}>
                    {debts.reduce((sum, d) => sum + (d.debt_amount - d.remaining_amount), 0).toFixed(2)} {shopDetails.currency}
                  </span>
                  <span className="stats-subtitle">Payments recovered from debtors</span>
                </div>
              </div>

              {/* Debts Table */}
              <div className="data-table-wrapper">
                <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 className="table-title">Customer Debts Ledger / سجل ديون الزبائن</h3>
                  <div className="search-input-wrapper" style={{ width: '300px' }}>
                    <Search className="search-input-icon" size={16} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '36px' }}
                      placeholder="Search debtor name or phone... / ابحث عن اسم الزبون..." 
                      value={searchDebtQuery}
                      onChange={(e) => setSearchDebtQuery(e.target.value)}
                    />
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer / الزبون</th>
                      <th>Contact / الاتصال</th>
                      <th>Total Debt / الدين الأصلي</th>
                      <th>Remaining / المتبقي</th>
                      <th>Date / التاريخ</th>
                      <th>Status / الحالة</th>
                      <th style={{ textAlign: 'right' }}>Actions / إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts
                      .filter(d => 
                        d.customer_name.toLowerCase().includes(searchDebtQuery.toLowerCase()) ||
                        (d.customer_phone && d.customer_phone.includes(searchDebtQuery))
                      )
                      .map((debt) => (
                        <tr key={debt.id}>
                          <td style={{ fontWeight: '600' }}>{debt.customer_name}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                              <span>{debt.customer_phone || '-'}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{debt.customer_email || ''}</span>
                            </div>
                          </td>
                          <td>{debt.debt_amount.toFixed(2)} {shopDetails.currency}</td>
                          <td style={{ fontWeight: 'bold', color: debt.remaining_amount > 0 ? 'var(--alert-error, #ef4444)' : 'var(--success-color, #10b981)' }}>
                            {debt.remaining_amount.toFixed(2)} {shopDetails.currency}
                          </td>
                          <td>{new Date(debt.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${
                              debt.status === 'paid' ? 'success' : debt.status === 'partially_paid' ? 'warning' : 'danger'
                            }`}>
                              {debt.status === 'paid' ? 'Paid / مسدد' : debt.status === 'partially_paid' ? 'Partial / مسدد جزئياً' : 'Unpaid / غير مسدد'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              {debt.remaining_amount > 0 && (
                                <button 
                                  className="btn btn-primary btn-sm" 
                                  style={{ padding: '6px 12px', fontSize: '13px' }}
                                  onClick={() => {
                                    setSelectedDebt(debt);
                                    setSettleAmount(debt.remaining_amount.toString());
                                    setIsSettleModalOpen(true);
                                  }}
                                >
                                  Settle / تسديد
                                </button>
                              )}
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                onClick={() => handleViewHistory(debt)}
                              >
                                History / السجل
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {debts.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          No debt transactions recorded / لا يوجد ديون مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL WINDOWS --- */}

      {/* 1. CHECKOUT FORM MODAL */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Checkout Confirmation</h3>
              <button className="modal-close" onClick={() => setIsCheckoutOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCheckoutSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div 
                      className={`payment-option ${checkoutMethod === 'cash' ? 'selected' : ''}`}
                      onClick={() => setCheckoutMethod('cash')}
                    >
                      <Wallet className="payment-option-icon" />
                      <span className="payment-option-label">Cash</span>
                    </div>
                    <div 
                      className={`payment-option ${checkoutMethod === 'sofizpay' ? 'selected' : ''}`}
                      onClick={() => setCheckoutMethod('sofizpay')}
                    >
                      <QrCode className="payment-option-icon" />
                      <span className="payment-option-label">SofizPay (Stellar)</span>
                    </div>
                    <div 
                      className={`payment-option ${checkoutMethod === 'cib' ? 'selected' : ''}`}
                      onClick={() => setCheckoutMethod('cib')}
                      style={checkoutMethod === 'cib' ? { borderColor: '#2563eb', background: 'rgba(37,99,235,0.12)' } : {}}
                    >
                      <CreditCard className="payment-option-icon" style={{ color: checkoutMethod === 'cib' ? '#2563eb' : undefined }} />
                      <span className="payment-option-label" style={{ color: checkoutMethod === 'cib' ? '#2563eb' : undefined }}>CIB QR Code</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Name (Optional)</label>
                  <div className="search-input-wrapper">
                    <User className="search-input-icon" size={14} style={{ left: '12px' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '34px' }}
                      placeholder="e.g. Ahmed Benali" 
                      value={customerDetails.name}
                      onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Phone (Optional)</label>
                    <div className="search-input-wrapper">
                      <Phone className="search-input-icon" size={14} style={{ left: '12px' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '34px' }}
                        placeholder="e.g. 0550123456" 
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Email (Optional)</label>
                    <div className="search-input-wrapper">
                      <Mail className="search-input-icon" size={14} style={{ left: '12px' }} />
                      <input 
                        type="email" 
                        className="form-input" 
                        style={{ paddingLeft: '34px' }}
                        placeholder="e.g. customer@email.dz" 
                        value={customerDetails.email}
                        onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="summary-row total" style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span>Total Amount Due:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--secondary)' }}>
                    {getCartTotals().total.toFixed(2)} {shopDetails.currency}
                  </span>
                </div>

                {/* Amount Paid + Remaining Debt — only for Cash. SofizPay auto-detects from Stellar memo */}
                {checkoutMethod === 'cash' && (
                  <>
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">Amount Paid / المبلغ المدفوع ({shopDetails.currency})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max={getCartTotals().total}
                        className="form-input"
                        placeholder={getCartTotals().total.toFixed(2)}
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                      />
                    </div>

                    <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '8px', color: 'var(--text-muted)' }}>
                      <span>Remaining Debt / الدين المتبقي:</span>
                      <span style={{ fontWeight: '600', color: (getCartTotals().total - parseFloat(amountPaidInput || getCartTotals().total)) > 0 ? '#ef4444' : 'inherit' }}>
                        {(getCartTotals().total - parseFloat(amountPaidInput || getCartTotals().total)).toFixed(2)} {shopDetails.currency}
                      </span>
                    </div>
                  </>
                )}

                {checkoutMethod === 'sofizpay' && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--card-bg-alt, rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <QrCode size={15} style={{ flexShrink: 0, color: 'var(--secondary)' }} />
                    <span>
                      الدين يُحسب تلقائياً من مبلغ معاملة الـ Stellar.
                      &nbsp;<strong style={{ color: 'var(--secondary)' }}>Debt is auto-detected</strong> from the QR payment memo.
                    </span>
                  </div>
                )}

                {checkoutMethod === 'cib' && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={15} style={{ flexShrink: 0, color: '#2563eb' }} />
                    <span>
                      سيتم إنشاء رمز QR خاص ببطاقة CIB يمكن للعميل مسحه بهاتفه.
                      &nbsp;<strong style={{ color: '#2563eb' }}>Customer scans QR</strong> to pay via their CIB bank card on their phone.
                    </span>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCheckoutOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SOFIZPAY QR GATEWAY & SIMULATOR */}
      {isSofizPayOpen && sofizPayDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">SofizPay QR Payment</h3>
              <button className="modal-close" onClick={handleCloseSofizPayModal}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="sofizpay-qr-container">
                <span className="sofizpay-logo-badge">SOFIZPAY INSTANT DEPOSIT</span>
                
                {sofizPayStatus === 'pending' && (
                  <>
                    <div className="qr-box">
                      <QRCodeSVG 
                        value={(() => {
                          const account = sofizPayDetails.account || 'G_MOCK_ACCOUNT';
                          const amount = parseFloat(sofizPayDetails.amount || getCartTotals().total);
                          const amountInCentimes = Math.round(amount * 100);
                          
                          let numericTxId = sofizPayDetails.cibTransactionId || '0';
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
                          return `sofizpay:${account}?a=${amount.toFixed(2)}&dt=${amountInCentimes}*${numericTxId}*169`;
                        })()} 
                        size={180} 
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="H"
                      />
                    </div>
                    
                    <p style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      Scan QR Code via EDAHABIA/CIB App
                    </p>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>Amount to Pay / المبلغ المطلوب للدفع: <strong style={{ color: 'var(--secondary)', fontSize: '15px' }}>{parseFloat(sofizPayDetails.amount).toFixed(2)} DZD</strong></span>
                      {parseFloat(sofizPayDetails.amount) < getCartTotals().total && (
                        <span style={{ fontSize: '12px', color: '#ef4444' }}>
                          Remaining Debt / الدين المتبقي: {(getCartTotals().total - parseFloat(sofizPayDetails.amount)).toFixed(2)} DZD
                        </span>
                      )}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '12px' }}>
                      <div className="pulse-loader">
                        <div className="pulse-dot"></div>
                        <div className="pulse-dot"></div>
                        <div className="pulse-dot"></div>
                      </div>
                      <span>Waiting for payment scanning confirmation...</span>
                    </div>

                    {/* Developer Mock Simulator panel */}
                    <div className="simulator-widget">
                      <div className="simulator-header">
                        <QrCode size={16} />
                        <span>Interactive Payment Simulator</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', lineHeight: '1.4' }}>
                        This is a simulated transaction. Click success to trigger the webhook/callback status immediately:
                      </p>
                      <div className="simulator-actions">
                        <button 
                          className="btn btn-success" 
                          style={{ flexGrow: 1, padding: '8px 12px', fontSize: '12px' }}
                          onClick={() => simulatePaymentSuccess(sofizPayDetails.cibTransactionId, sofizPayDetails.saleId, true)}
                        >
                          Simulate Success
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ flexGrow: 1, padding: '8px 12px', fontSize: '12px' }}
                          onClick={() => simulatePaymentSuccess(sofizPayDetails.cibTransactionId, sofizPayDetails.saleId, false)}
                        >
                          Simulate Failure
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {sofizPayStatus === 'success' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
                    <CheckCircle2 size={64} style={{ color: 'var(--secondary)' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>Payment Verified!</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Transaction processed successfully via CIB gateway.</p>
                  </div>
                )}

                {sofizPayStatus === 'failed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
                    <Ban size={64} style={{ color: 'var(--danger)' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>Payment Cancelled / Failed</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>The transaction was rejected by customer or gateway timed out.</p>
                    <button className="btn btn-secondary" onClick={handleCloseSofizPayModal} style={{ marginTop: '12px' }}>
                      Close Modal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2b. CIB QR PAYMENT MODAL */}
      {isCibQrOpen && cibQrDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid rgba(37,99,235,0.3)' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: '#2563eb' }} />
                CIB QR Payment
              </h3>
              <button className="modal-close" onClick={handleCloseCibQrModal}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div className="sofizpay-qr-container">
                <span className="sofizpay-logo-badge" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', letterSpacing: '0.5px' }}>
                  CIB BANK CARD PAYMENT
                </span>
                
                {cibQrStatus === 'pending' && (
                  <>
                    <div className="qr-box" style={{ border: '3px solid rgba(37,99,235,0.3)', borderRadius: '12px', padding: '8px', background: 'white' }}>
                      {cibQrDetails.isMock ? (
                        // Mock mode: show QR of a placeholder CIB URL
                        <QRCodeSVG
                          value={`https://sofizpay.com/cib-pay/?sim=true&amount=${cibQrDetails.amount}&id=${cibQrDetails.cibTransactionId}`}
                          size={180}
                          bgColor="#ffffff"
                          fgColor="#1d4ed8"
                          level="H"
                        />
                      ) : (
                        // Real mode: encode the actual SofizPay-hosted CIB payment page URL
                        <QRCodeSVG
                          value={cibQrDetails.paymentUrl}
                          size={180}
                          bgColor="#ffffff"
                          fgColor="#1d4ed8"
                          level="H"
                        />
                      )}
                    </div>

                    <p style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
                      Scan with CIB Mobile App / مسح برنامج CIB
                    </p>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>Amount / المبلغ المطلوب: <strong style={{ color: '#2563eb', fontSize: '15px' }}>{parseFloat(cibQrDetails.amount).toFixed(2)} DZD</strong></span>
                      {cibQrDetails.isMock && (
                        <span style={{ fontSize: '11px', color: 'var(--warning)' }}>⚠ Simulation mode — no real bank account configured</span>
                      )}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '12px' }}>
                      <div className="pulse-loader">
                        <div className="pulse-dot" style={{ background: '#2563eb' }}></div>
                        <div className="pulse-dot" style={{ background: '#2563eb' }}></div>
                        <div className="pulse-dot" style={{ background: '#2563eb' }}></div>
                      </div>
                      <span>Waiting for CIB payment confirmation...</span>
                    </div>

                    {/* Simulator panel */}
                    <div className="simulator-widget" style={{ borderColor: 'rgba(37,99,235,0.25)', background: 'rgba(37,99,235,0.05)' }}>
                      <div className="simulator-header" style={{ color: '#2563eb' }}>
                        <CreditCard size={16} />
                        <span>CIB Payment Simulator</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', lineHeight: '1.4' }}>
                        Simulated CIB transaction. Click to trigger status immediately:
                      </p>
                      <div className="simulator-actions">
                        <button 
                          className="btn btn-success" 
                          style={{ flexGrow: 1, padding: '8px 12px', fontSize: '12px' }}
                          onClick={() => simulatePaymentSuccess(cibQrDetails.cibTransactionId, cibQrDetails.saleId, true)}
                        >
                          Simulate Success
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ flexGrow: 1, padding: '8px 12px', fontSize: '12px' }}
                          onClick={() => simulatePaymentSuccess(cibQrDetails.cibTransactionId, cibQrDetails.saleId, false)}
                        >
                          Simulate Failure
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {cibQrStatus === 'success' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
                    <CheckCircle2 size={64} style={{ color: '#2563eb' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>CIB Payment Confirmed!</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Bank card transaction processed successfully.</p>
                  </div>
                )}

                {cibQrStatus === 'failed' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 0' }}>
                    <Ban size={64} style={{ color: 'var(--danger)' }} />
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>CIB Payment Failed</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>The CIB transaction was declined or timed out.</p>
                    <button className="btn btn-secondary" onClick={handleCloseCibQrModal} style={{ marginTop: '12px' }}>
                      Close Modal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RECEIPT VIEWER / PRINTER MODAL */}
      {isReceiptOpen && currentReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h3 className="modal-title font-bold">Print Receipt</h3>
              <button className="modal-close" onClick={() => setIsReceiptOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="receipt-box" id="thermal-receipt-print">
                <div className="receipt-title">{shopDetails.name}</div>
                <div className="receipt-subtitle" style={{ fontSize: '11px', margin: '4px 0' }}>{shopDetails.address}</div>
                <div className="receipt-subtitle" style={{ fontSize: '11px' }}>Tel: {shopDetails.phone}</div>
                
                <div className="receipt-divider"></div>
                
                <div className="receipt-row">
                  <span>Invoice #:</span>
                  <span style={{ fontWeight: 'bold' }}>{currentReceipt.sale.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="receipt-row">
                  <span>Date:</span>
                  <span>{new Date(currentReceipt.sale.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <div className="receipt-row">
                  <span>Payment:</span>
                  <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {currentReceipt.sale.payment_method === 'sofizpay' ? 'SofizPay QR' : currentReceipt.sale.payment_method}
                  </span>
                </div>
                {currentReceipt.sale.sofizpay_id && (
                  <div className="receipt-row" style={{ fontSize: '11px' }}>
                    <span>CIB Ref:</span>
                    <span>{currentReceipt.sale.sofizpay_id.substring(0, 12)}</span>
                  </div>
                )}

                <div className="receipt-divider"></div>
                
                <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Item Desc</span>
                  <span>Qty x Price = Total</span>
                </div>

                {currentReceipt.items.map((item, idx) => (
                  <div key={idx} className="receipt-item-row" style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600' }}>{item.name}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '12px' }}>
                      <span>{item.quantity} x {item.price.toFixed(2)} DZD</span>
                      <span>{(item.quantity * item.price).toFixed(2)} DZD</span>
                    </div>
                  </div>
                ))}

                <div className="receipt-divider"></div>

                <div className="receipt-row">
                  <span>Subtotal:</span>
                  <span>
                    {(currentReceipt.sale.total_amount / (1 + (shopDetails.vatRate / 100))).toFixed(2)} DZD
                  </span>
                </div>
                <div className="receipt-row">
                  <span>VAT ({shopDetails.vatRate}%):</span>
                  <span>
                    {(currentReceipt.sale.total_amount - (currentReceipt.sale.total_amount / (1 + (shopDetails.vatRate / 100)))).toFixed(2)} DZD
                  </span>
                </div>
                <div className="receipt-row" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  <span>TOTAL DUE:</span>
                  <span>{currentReceipt.sale.total_amount.toFixed(2)} DZD</span>
                </div>

                <div className="receipt-divider"></div>
                
                <div className="receipt-footer">
                  <p>Shukran / Thank you for your visit!</p>
                  <p>Powered by DzPos POS Terminal</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => handlePrint('thermal-receipt-print')}>
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
              <button className="btn btn-secondary" onClick={() => setIsReceiptOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRODUCT ADD/EDIT MODAL */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {productFormMode === 'create' ? 'Add New Catalog Product' : 'Edit Catalog Product'}
              </h3>
              <button className="modal-close" onClick={() => setIsProductModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleProductSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    placeholder="e.g. Mahjouba Harra" 
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU / Barcode</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="e.g. MHJ-HRR" 
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select" 
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    >
                      <option value="Beverages">Beverages</option>
                      <option value="Food">Food</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (DZD)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      className="form-input" 
                      required 
                      placeholder="e.g. 120" 
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input" 
                      required 
                      placeholder="e.g. 50" 
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {productFormMode === 'create' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. SETTLE DEBT MODAL */}
      {isSettleModalOpen && selectedDebt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Settle Debt / تسديد الدين</h3>
              <button className="modal-close" onClick={() => setIsSettleModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSettleDebt}>
              <div className="modal-body">
                <div style={{ background: 'var(--card-bg-alt, #f8f9fa)', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <span style={{ fontWeight: 'bold' }}>{selectedDebt.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Remaining Debt:</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{selectedDebt.remaining_amount.toFixed(2)} {shopDetails.currency}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Settle Amount / المبلغ المدفوع ({shopDetails.currency})</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    max={selectedDebt.remaining_amount}
                    className="form-input" 
                    required 
                    placeholder="e.g. 50"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method / طريقة الدفع</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="settleMethod" 
                        value="cash"
                        checked={settleMethod === 'cash'} 
                        onChange={() => setSettleMethod('cash')} 
                      />
                      <span>Cash / نقدأ</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="settleMethod" 
                        value="sofizpay"
                        checked={settleMethod === 'sofizpay'} 
                        onChange={() => setSettleMethod('sofizpay')} 
                      />
                      <span>SofizPay (Manual)</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSettleModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSettleLoading}>
                  {isSettleLoading ? 'Saving...' : 'Record Payment / تسجيل الدفع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DEBT PAYMENT HISTORY MODAL */}
      {isHistoryModalOpen && selectedDebt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Payment History / سجل المدفوعات</h3>
              <button className="modal-close" onClick={() => setIsHistoryModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer: </span>
                <span style={{ fontWeight: 'bold' }}>{selectedDebt.customer_name}</span>
              </div>

              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>Loading payment history...</div>
              ) : selectedDebtHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No payments recorded yet / لا يوجد دفعات مسجلة</div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Date / التاريخ</th>
                        <th>Amount / المبلغ</th>
                        <th>Method / طريقة الدفع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDebtHistory.map((pmt) => (
                        <tr key={pmt.id}>
                          <td>{new Date(pmt.created_at).toLocaleString()}</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--success-color, #10b981)' }}>
                            +{pmt.amount_paid.toFixed(2)} {shopDetails.currency}
                          </td>
                          <td>
                            <span style={{ textTransform: 'capitalize' }}>{pmt.payment_method}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsHistoryModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
