"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, Store, CheckCircle2, Key } from 'lucide-react';

export default function SignUp() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [sofizpayKey, setSofizpayKey] = useState('G_MOCK_ACCOUNT');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, go to dashboard
    const savedMerchant = localStorage.getItem('dzpos_merchant');
    if (savedMerchant) {
      router.push('/dashboard');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          shop_name: shopName,
          sofizpay_key: sofizpayKey
        })
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration submit error:', err);
      setError('Connection failed. Please check if server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top, #1e1b4b 0%, #0f172a 100%)',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '440px',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            color: 'white'
          }}>
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '0.5px' }}>Register Shop</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
            Set up your store dashboard to accept SofizPay and manage basics
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--secondary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Shop Name</label>
            <div className="search-input-wrapper">
              <Store className="search-input-icon" size={16} style={{ left: '12px' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '44px' }}
                placeholder="e.g. Oran Sweets Café"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Merchant Email Address</label>
            <div className="search-input-wrapper">
              <Mail className="search-input-icon" size={16} style={{ left: '12px' }} />
              <input 
                type="email" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '44px' }}
                placeholder="merchant@email.dz"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">SofizPay Stellar Public Key</label>
            <div className="search-input-wrapper">
              <Key className="search-input-icon" size={16} style={{ left: '12px' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '44px' }}
                placeholder="starts with G... or keep G_MOCK_ACCOUNT"
                required
                value={sofizpayKey}
                onChange={(e) => setSofizpayKey(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Used to receive EDAHABIA / CIB QR code customer payments.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div className="search-input-wrapper">
              <Lock className="search-input-icon" size={16} style={{ left: '12px' }} />
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '44px' }}
                placeholder="Min. 6 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm Password</label>
            <div className="search-input-wrapper">
              <Lock className="search-input-icon" size={16} style={{ left: '12px' }} />
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: '38px', height: '44px' }}
                placeholder="Repeat password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="checkout-btn" 
            style={{ height: '46px', marginTop: '14px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <span>Register Store</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already registered? </span>
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Merchant Login
          </Link>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
