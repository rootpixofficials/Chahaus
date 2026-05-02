'use client';

import { useState } from 'react';

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Masala Chai', price: 20, imageUrl: 'https://images.unsplash.com/photo-1576092762791-dd9e2220abd4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
  { id: 2, name: 'Green Tea', price: 25, imageUrl: 'https://images.unsplash.com/photo-1627492275512-4091a114f243?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
  { id: 3, name: 'Samosa', price: 15, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
  { id: 4, name: 'Puff', price: 12, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }, // fallback image
];

export default function POSDashboard() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.qty), 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <main className="pos-main">
        <header className="pos-header">
          <h2>Tea Shop POS</h2>
          <button style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }} onClick={() => window.location.href = '/login'}>Logout</button>
        </header>
        <div className="pos-content">
          <div className="pos-grid">
            {DUMMY_PRODUCTS.map(product => (
              <div key={product.id} className="product-card" onClick={() => addToCart(product)}>
                <img src={product.imageUrl} alt={product.name} className="product-image" />
                <div style={{ fontWeight: '600' }}>{product.name}</div>
                <div className="product-price">₹{product.price}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <aside className="pos-cart-sidebar">
        <div className="cart-header">
          <h3 style={{ margin: 0 }}>Current Order</h3>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cart is empty</p>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="cart-item">
                <div>
                  <div style={{ fontWeight: '600' }}>{item.product.name}</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>₹{item.product.price} x {item.qty}</div>
                </div>
                <div style={{ fontWeight: 'bold' }}>₹{item.product.price * item.qty}</div>
              </div>
            ))
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-total">
            <span>Total:</span>
            <span style={{ color: '#10b981' }}>₹{calculateTotal()}</span>
          </div>
          <button className="btn-print" onClick={handlePrint} disabled={cart.length === 0}>
            Print Receipt
          </button>
        </div>
      </aside>

      {/* Thermal Print Receipt Wrapper */}
      <div className="receipt-print-wrapper">
        <div className="receipt-title">TEA SHOP</div>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>Date: {new Date().toLocaleDateString()}</div>
        <div style={{ borderBottom: '1px dashed black', margin: '10px 0' }}></div>
        {cart.map((item, idx) => (
          <div key={idx} className="receipt-item">
            <span>{item.qty}x {item.product.name}</span>
            <span>₹{item.product.price * item.qty}</span>
          </div>
        ))}
        <div className="receipt-total">
          <span>TOTAL:</span>
          <span>₹{calculateTotal()}</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8em' }}>Thank you for visiting!</div>
      </div>
    </>
  );
}
