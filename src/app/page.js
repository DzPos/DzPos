"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, QrCode, CreditCard, ShieldCheck, Tablet, 
  ChevronRight, BarChart3, Archive, Layers, ArrowRight, ExternalLink 
} from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    const savedMerchant = localStorage.getItem('dzpos_merchant');
    if (savedMerchant) {
      setIsLoggedIn(true);
      const merchantObj = JSON.parse(savedMerchant);
      setShopName(merchantObj.shopName || 'Your Shop');
    }
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAVIGATION HEADER */}
      <header style={{
        height: '80px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            color: 'white'
          }}>
            <ShoppingBag size={22} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px' }}>DzPos</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#features" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }} className="nav-link">Features</a>
          <a href="#preview" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }} className="nav-link">Preview</a>
          <a href="#pricing" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }} className="nav-link">Pricing</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <span>Enter {shopName}</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary" style={{ textDecoration: 'none', padding: '10px 18px' }}>
                <span>Get Started</span>
                <ChevronRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{
        padding: '100px 24px 80px 24px',
        textAlign: 'center',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 70%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative ambient lights */}
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          borderRadius: 'var(--radius-full)',
          filter: 'blur(80px)',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1
        }}></div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '840px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            color: 'var(--primary)',
            fontWeight: 700,
            marginBottom: '28px'
          }}>
            <QrCode size={14} />
            <span>Accept EDAHABIA & CIB QR code scanning via SofizPay</span>
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            marginBottom: '24px',
            background: 'linear-gradient(to right, #ffffff, #c7d2fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            The Lightweight POS <br />
            Built for Small Shop Tablets
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto 40px auto'
          }}>
            Tailored specifically for local retail and cafés in Algeria. Monitor inventory, compile End-of-Day reports, and secure card deposits instantly using our integrated payment simulator.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="checkout-btn" style={{ textDecoration: 'none', padding: '16px 32px', maxWidth: '300px' }}>
                <span>Open Terminal Console</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="checkout-btn" style={{ textDecoration: 'none', padding: '16px 32px', maxWidth: '280px' }}>
                  <span>Register Store Now</span>
                  <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '16px 28px', fontSize: '16px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', height: '54px', borderRadius: 'var(--radius-md)' }}>
                  <span>Merchant Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* MOCK PREVIEW IFRAME OR HERO PIC */}
        <div id="preview" style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '960px',
          margin: '80px auto 0 auto',
          backgroundColor: 'var(--bg-secondary)',
          border: '6px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), var(--shadow-glow)',
          overflow: 'hidden'
        }}>
          {/* Mock Browser Header */}
          <div style={{
            height: '40px',
            backgroundColor: '#0b0f19',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '6px'
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 30px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginLeft: '30px'
            }}>
              https://dzpos.dz/dashboard
            </div>
          </div>
          {/* Static dashboard illustration */}
          <div style={{ padding: '40px', background: '#0e1322', display: 'flex', gap: '20px', textAlign: 'left' }}>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '4px', backgroundColor: 'var(--primary)' }}></div>
                <div style={{ width: '120px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--border-color)', marginTop: '8px' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ height: '120px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px', display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
                  <div style={{ width: '50px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                  <div style={{ width: '90px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--secondary)', marginTop: '12px' }}></div>
                </div>
                <div style={{ height: '120px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px' }}>
                  <div style={{ width: '50px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                  <div style={{ width: '60px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--primary)', marginTop: '12px' }}></div>
                </div>
                <div style={{ height: '120px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px' }}>
                  <div style={{ width: '50px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                  <div style={{ width: '70px', height: '24px', borderRadius: '4px', backgroundColor: 'var(--warning)', marginTop: '12px' }}></div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ height: '200px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px' }}></div>
                <div style={{ height: '200px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px' }}></div>
              </div>
            </div>
            <div style={{ width: '220px', height: '356px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '80px', height: '14px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}></div>
              <div style={{ height: '40px', borderRadius: '4px', backgroundColor: 'var(--primary)' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" style={{ padding: '80px 24px', backgroundColor: '#0b0f19' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Everything Your Store Needs</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto' }}>
              DzPos strips away the complexity of traditional enterprise systems to offer a lightweight basics platform optimized for touchscreen tablets.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
            {/* Feature 1 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <QrCode size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>SofizPay QR Scanner</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Generate instantaneous payment link QR codes. Customers scan the screen with their phone to settle invoices directly via EDAHABIA or CIB cards.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Turso DB Backend</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Powered by a fast, cloud-replicated Turso edge SQLite database, providing ultra-responsive loading speeds even in areas with sparse internet.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Archive size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Inventory Basics</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Add items, track remaining shelf count, adjust prices instantly, and display color-coded indicators when a product reaches critical stock quantities.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <BarChart3 size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>End-of-Day Reporting</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Audit daily sales metrics, monitor cash vs card breakdown, and generate printable EOD reports to keep your merchant operations synced.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <Tablet size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Tablet Tailored UI</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Perfectly sized touch targets, a dual-pane register layout, and clean typography that functions beautifully on any standard Android or iPad device.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="stats-card" style={{ padding: '30px 24px', minHeight: '220px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>Secure Rest APIs</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                No secret keys are exposed frontend. API integrations check gateway values server-side for maximum reliability and protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Transparent, Simple Plans</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto' }}>
              Get started with our free demo account or connect your shop's SofizPay merchant key for production checkout.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
            {/* Free Plan */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 32px',
              maxWidth: '340px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)' }}>Demo / Sandbox</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '20px 0' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800 }}>0 DA</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ month</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                  Perfect for exploring the POS system features and testing payment flows via our simulator.
                </p>
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px 0' }}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', fontSize: '13px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Access to Register Terminal</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Seeded Algerian Café Catalog</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Interactive Payment Simulator</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>19% VAT Calculations</span>
                    </li>
                  </ul>
                </div>
              </div>
              <Link href="/signup" className="btn btn-secondary" style={{ textDecoration: 'none', width: '100%', display: 'flex', justifyContent: 'center', height: '42px', marginTop: '20px' }}>
                Start Free Demo
              </Link>
            </div>

            {/* Pro Plan */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '2px solid var(--primary)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 32px',
              maxWidth: '340px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-glow)',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)'
              }}>
                RECOMMENDED
              </span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Merchant Integration</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '20px 0' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800 }}>Free</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ no fixed fees</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                  Connect your live SofizPay account to process payments from customers directly via EDAHABIA & CIB.
                </p>
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px 0' }}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', listStyle: 'none', fontSize: '13px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <strong>Everything in Sandbox Demo</strong>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Live SofizPay Account Link</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Real CIB/EDAHABIA QR scanning</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--secondary)' }}>✓</span>
                      <span>Persistent Sales & Inventory database</span>
                    </li>
                  </ul>
                </div>
              </div>
              <Link href="/signup" className="checkout-btn" style={{ textDecoration: 'none', width: '100%', display: 'flex', justifyContent: 'center', height: '42px', marginTop: '20px' }}>
                Register Merchant Shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section style={{
        padding: '80px 24px',
        backgroundColor: '#0b0f19',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 900 }}>Ready to Modernize Your Checkout?</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Set up your shop configuration, seed a product catalog, and process QR code invoices instantly.
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="checkout-btn" style={{ textDecoration: 'none', padding: '14px 28px' }}>
                <span>Back to your Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link href="/signup" className="checkout-btn" style={{ textDecoration: 'none', padding: '14px 28px' }}>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '14px 24px' }}>
                  <span>Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        height: '100px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        <div>
          <span>© 2026 DzPos. Tailored for small Algerian merchants.</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Integration via SofizPay APIs</span>
          <span>|</span>
          <a href="https://docs.sofizpay.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>SofizPay Docs</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </footer>

    </div>
  );
}
