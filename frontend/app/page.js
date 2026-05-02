'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import './pos/pos.css';

export default function Home() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [cart, setCart] = useState([]);
    const [view, setView] = useState('products'); 
    const [bills, setBills] = useState([]);
    const [showReceipt, setShowReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');
    const [editBillId, setEditBillId] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [billPage, setBillPage] = useState(1);
    const billsPerPage = 10;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('token');
            const res = await fetch('http://localhost:5000/api/customer/pos-data', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setCategories([{ id: 0, name: 'All' }, ...data.categories]);
                setProducts(data.products);
            }

            const billsRes = await fetch('http://localhost:5000/api/customer/bills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const billsData = await billsRes.json();
            if (billsRes.ok) setBills(billsData);

        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            Cookies.remove('token');
            Cookies.remove('role');
            window.location.href = '/login';
        }
    };

    const updateCart = (product, delta) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            const newQty = existing.quantity + delta;
            if (newQty <= 0) {
                setCart(cart.filter(item => item.product_id !== product.id));
            } else {
                setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: newQty, subtotal: newQty * product.sales_rate } : item));
            }
        } else if (delta > 0) {
            setCart([...cart, { 
                product_id: product.id, 
                name: product.name, 
                price: product.sales_rate, 
                quantity: 1, 
                subtotal: product.sales_rate 
            }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const calculateTotal = () => cart.reduce((sum, item) => sum + Number(item.subtotal), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        try {
            const token = Cookies.get('token');
            const url = editBillId 
                ? `http://localhost:5000/api/customer/bills/${editBillId}`
                : 'http://localhost:5000/api/customer/bills';
            const method = editBillId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    total_amount: calculateTotal(),
                    payment_method: paymentMethod,
                    items: cart
                })
            });

            if (res.ok) {
                const data = editBillId ? { bill_number: bills.find(b => b.id === editBillId).bill_number } : await res.json();
                setShowReceipt({
                    bill_number: data.bill_number,
                    items: cart,
                    total: calculateTotal(),
                    payment_method: paymentMethod,
                    date: new Date().toLocaleString()
                });
                setCart([]);
                setEditBillId(null);
                setPaymentMethod('Cash'); // Reset to default
                fetchData(); 
            }
        } catch (err) {
            alert('Checkout failed');
        }
    };

    const handleEditBill = async (bill) => {
        try {
            const token = Cookies.get('token');
            const res = await fetch(`http://localhost:5000/api/customer/bills/${bill.id}/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const items = await res.json();
            if (res.ok) {
                setCart(items.map(i => ({
                    product_id: i.product_id,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    subtotal: i.subtotal
                })));
                setEditBillId(bill.id);
                setView('products');
            }
        } catch (err) {
            alert('Failed to load bill for editing');
        }
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (sortBy === 'price-low') return a.sales_rate - b.sales_rate;
        if (sortBy === 'price-high') return b.sales_rate - a.sales_rate;
        if (sortBy === 'high-selling') return b.sales_count - a.sales_count;
        return 0;
    });

    const filteredProducts = activeTab === 'All' 
        ? sortedProducts 
        : sortedProducts.filter(p => categories.find(c => c.name === activeTab)?.id === p.category_id);

    if (loading) return <div className="pos-container" style={{justifyContent:'center', alignItems:'center'}}><h2>Loading Cha Haus POS...</h2></div>;

    return (
        <div className="pos-container">
            {/* Header */}
            <header className="pos-header">
                <div className="pos-logo">
                    <img src="/Image/Cha_Haus_logo_final-removebg-preview.png" alt="Logo" style={{width:'auto', objectFit:'contain'}} />
                    <span>Cha Haus</span>
                </div>
                <div style={{display:'flex', gap:'20px', alignItems:'center'}}>
                    {editBillId && <div style={{background:'#fef3c7', color:'#92400e', padding:'6px 12px', borderRadius:'8px', fontSize:'14px', fontWeight:'bold'}}>Editing Bill #{bills.find(b => b.id === editBillId)?.bill_number}</div>}
                    <button className="no-print" onClick={handleLogout} style={{color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontWeight:'bold'}}>Logout 🚪</button>
                </div>
            </header>

            {/* Sub-header with Tabs */}
            {view === 'products' && (
                <div className="no-print" style={{background:'white', display:'flex', justifyContent:'center', padding:'0 20px', borderBottom:'1px solid #e2e8f0'}}>
                    <nav className="pos-tabs" style={{border:'none'}}>
                        {categories.map(cat => (
                            <div 
                                key={cat.id} 
                                className={`tab-item ${activeTab === cat.name ? 'active' : ''}`}
                                onClick={() => setActiveTab(cat.name)}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </nav>
                </div>
            )}

            <div className="pos-body">
                {view === 'products' ? (
                    <>
                        <main className="pos-products-area">
                            {filteredProducts.map(product => {
                                const cartItem = cart.find(item => item.product_id === product.id);
                                return (
                                    <div key={product.id} className="product-card">
                                        <div style={{position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.9)', padding:'2px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:'bold', color:'#059669', border:'1px solid #059669'}}>
                                            Sold: {product.sales_count}
                                        </div>
                                        <img src={product.image_url || 'https://via.placeholder.com/150'} className="product-image" alt={product.name} />
                                        <div className="product-info">
                                            <div className="product-name">{product.name}</div>
                                            <div className="product-price">₹{product.sales_rate}</div>
                                            <div className="qty-controls">
                                                <div className="qty-btn" onClick={() => updateCart(product, -1)}>-</div>
                                                <input type="text" readOnly className="qty-input" value={cartItem ? cartItem.quantity : 0} />
                                                <div className="qty-btn" onClick={() => updateCart(product, 1)}>+</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </main>

                        <aside className="pos-cart-sidebar no-print">
                            <div className="cart-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>{editBillId ? 'Update Order' : 'Current Order'}</span>
                                {cart.length > 0 && (
                                    <button 
                                        onClick={() => { if(window.confirm('Clear all items from cart?')) setCart([]); }}
                                        style={{background:'#fee2e2', color:'#ef4444', border:'none', padding:'4px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:'800', cursor:'pointer'}}
                                    >🗑️ Clear</button>
                                )}
                            </div>
                            <div className="cart-items">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="cart-item">
                                        <div className="cart-item-info">
                                            <div className="cart-item-name">{item.name}</div>
                                            <div className="cart-item-price">₹{item.price} x {item.quantity}</div>
                                        </div>
                                        <div className="cart-item-total" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                            <span>₹{item.subtotal}</span>
                                            <button 
                                                onClick={() => removeFromCart(item.product_id)}
                                                style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'16px', padding:'0 5px'}}
                                                title="Remove item"
                                            >×</button>
                                        </div>
                                    </div>
                                ))}
                                {cart.length === 0 && <p style={{textAlign:'center', marginTop:'50px', color:'#94a3b8'}}>Your cart is empty</p>}
                            </div>
                            <div className="cart-footer">
                                <div style={{marginBottom:'15px'}}>
                                    <div style={{fontSize:'12px', fontWeight:'800', color:'#64748b', textTransform:'uppercase', marginBottom:'8px', letterSpacing:'0.5px'}}>Payment Method</div>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <button 
                                            onClick={() => setPaymentMethod('Cash')}
                                            style={{flex:1, padding:'10px', borderRadius:'10px', border:'2px solid', borderColor: paymentMethod === 'Cash' ? '#059669' : '#e2e8f0', background: paymentMethod === 'Cash' ? '#ecfdf5' : 'white', color: paymentMethod === 'Cash' ? '#059669' : '#64748b', fontWeight:'bold', cursor:'pointer', transition:'all 0.2s'}}
                                        >💵 Cash</button>
                                        <button 
                                            onClick={() => setPaymentMethod('Online')}
                                            style={{flex:1, padding:'10px', borderRadius:'10px', border:'2px solid', borderColor: paymentMethod === 'Online' ? '#059669' : '#e2e8f0', background: paymentMethod === 'Online' ? '#ecfdf5' : 'white', color: paymentMethod === 'Online' ? '#059669' : '#64748b', fontWeight:'bold', cursor:'pointer', transition:'all 0.2s'}}
                                        >💳 Online</button>
                                    </div>
                                </div>
                                <div className="cart-total-row">
                                    <span>Total</span>
                                    <span>₹{calculateTotal()}</span>
                                </div>
                                <button className="btn-checkout" onClick={handleCheckout} disabled={cart.length === 0} style={{background: editBillId ? '#d97706' : '#059669'}}>
                                    {editBillId ? 'Update & Print' : 'Complete & Print'}
                                </button>
                                {editBillId && <button onClick={() => { setEditBillId(null); setCart([]); setPaymentMethod('Cash'); }} style={{width:'100%', marginTop:'10px', padding:'10px', background:'#e2e8f0', border:'none', borderRadius:'14px', fontWeight:'bold', color:'#475569', cursor:'pointer'}}>Cancel Edit</button>}
                            </div>
                        </aside>
                    </>
                ) : (
                    <main className="pos-products-area" style={{display:'block'}}>
                        <div className="bills-table-container">
                            <h2 style={{marginBottom:'20px'}}>Recent Bills</h2>
                            <table className="bills-table">
                                <thead>
                                    <tr>
                                        <th>Bill #</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bills.slice((billPage - 1) * billsPerPage, billPage * billsPerPage).map(bill => (
                                        <tr key={bill.id}>
                                            <td>{bill.bill_number}</td>
                                            <td>{new Date(bill.created_at).toLocaleString()}</td>
                                            <td>₹{bill.total_amount}</td>
                                            <td>{bill.payment_method}</td>
                                            <td style={{display:'flex', gap:'8px'}}>
                                                <button onClick={async () => {
                                                    const token = Cookies.get('token');
                                                    const res = await fetch(`http://localhost:5000/api/customer/bills/${bill.id}/items`, {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    const items = await res.json();
                                                    setShowReceipt({
                                                        bill_number: bill.bill_number,
                                                        items: items.map(i => ({...i, subtotal: i.subtotal})),
                                                        total: bill.total_amount,
                                                        payment_method: bill.payment_method,
                                                        date: new Date(bill.created_at).toLocaleString()
                                                    });
                                                }} style={{padding:'6px 12px', borderRadius:'6px', border:'1px solid #059669', color:'#059669', background:'white', cursor:'pointer', fontWeight:'bold'}}>View</button>
                                                
                                                <button onClick={() => handleEditBill(bill)} style={{padding:'6px 12px', borderRadius:'6px', border:'1px solid #d97706', color:'#d97706', background:'white', cursor:'pointer', fontWeight:'bold'}}>Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {/* Bills Pagination */}
                            {bills.length > billsPerPage && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '10px' }}>
                                    <button 
                                        onClick={() => setBillPage(prev => Math.max(prev - 1, 1))} 
                                        disabled={billPage === 1} 
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 'bold', cursor: billPage === 1 ? 'not-allowed' : 'pointer', opacity: billPage === 1 ? 0.5 : 1 }}
                                    >
                                        ← Prev
                                    </button>
                                    {[...Array(Math.ceil(bills.length / billsPerPage))].map((_, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => setBillPage(idx + 1)} 
                                            style={{ 
                                                padding: '8px 12px', 
                                                borderRadius: '8px', 
                                                border: `1px solid ${billPage === idx + 1 ? '#be9249' : '#e2e8f0'}`, 
                                                background: billPage === idx + 1 ? '#be9249' : 'white', 
                                                color: billPage === idx + 1 ? 'white' : '#be9249', 
                                                fontWeight: 'bold', 
                                                cursor: 'pointer' 
                                            }}
                                        >
                                            {idx + 1}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setBillPage(prev => Math.min(prev + 1, Math.ceil(bills.length / billsPerPage)))} 
                                        disabled={billPage === Math.ceil(bills.length / billsPerPage)} 
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 'bold', cursor: billPage === Math.ceil(bills.length / billsPerPage) ? 'not-allowed' : 'pointer', opacity: billPage === Math.ceil(bills.length / billsPerPage) ? 0.5 : 1 }}
                                    >
                                        Next →
                                    </button>
                                </div>
                            )}
                        </div>
                    </main>
                )}
            </div>

            {/* Bottom Bar */}
            <nav className="pos-bottom-bar no-print">
                <div className={`bottom-bar-item ${view === 'products' ? 'active' : ''}`} onClick={() => setView('products')}>
                    <span className="bottom-bar-icon">🛍️</span>
                    <span>Products</span>
                </div>
                <div className={`bottom-bar-item ${view === 'bills' ? 'active' : ''}`} onClick={() => setView('bills')}>
                    <span className="bottom-bar-icon">🧾</span>
                    <span>Bills</span>
                </div>
            </nav>

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="receipt-preview-modal">
                    <div className="receipt-content">
                        <div className="receipt-header">
                            <img src="/Image/Cha_Haus_logo_final-removebg-preview.png" alt="Logo" className="receipt-logo" />
                            <div style={{fontSize:'20px', fontWeight:'bold'}}>CHA HAUS</div>
                            <div style={{fontSize:'12px'}}>Tea & Snacks</div>
                        </div>
                        <div className="receipt-divider"></div>
                        <div style={{fontSize:'12px', marginBottom:'10px'}}>
                            <div>No: {showReceipt.bill_number}</div>
                            <div>Date: {showReceipt.date}</div>
                        </div>
                        <div className="receipt-divider"></div>
                        {showReceipt.items.map((item, idx) => (
                            <div key={idx} className="receipt-row">
                                <span>{item.quantity} x {item.name}</span>
                                <span>₹{item.subtotal}</span>
                            </div>
                        ))}
                        <div className="receipt-divider"></div>
                        <div className="receipt-row">
                            <span>Payment Method</span>
                            <span>{showReceipt.payment_method}</span>
                        </div>
                        <div className="receipt-row" style={{fontWeight:'bold', fontSize:'16px'}}>
                            <span>TOTAL</span>
                            <span>₹{showReceipt.total}</span>
                        </div>
                        <div style={{textAlign:'center', marginTop:'30px', fontSize:'12px'}}>
                            Thank you for visiting Cha Haus!
                        </div>
                        
                        <div className="no-print" style={{marginTop:'20px', display:'flex', gap:'10px'}}>
                            <button onClick={() => window.print()} style={{flex:1, padding:'10px', background:'#059669', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold'}}>Print Bill</button>
                            <button onClick={() => setShowReceipt(null)} style={{flex:1, padding:'10px', background:'#e2e8f0', color:'#475569', border:'none', borderRadius:'8px', fontWeight:'bold'}}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
