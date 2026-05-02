'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function AdminBills() {
    const [bills, setBills] = useState([]);
    const [showReceipt, setShowReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const token = Cookies.get('token');
            const res = await fetch('http://localhost:5000/api/admin/bills', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setBills(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const viewBill = async (bill) => {
        try {
            const token = Cookies.get('token');
            const res = await fetch(`http://localhost:5000/api/admin/bills/${bill.id}/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const items = await res.json();
            if (res.ok) {
                setShowReceipt({
                    ...bill,
                    items,
                    date: new Date(bill.created_at).toLocaleString()
                });
            }
        } catch (err) {
            alert('Failed to load bill items');
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(bills.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = bills.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <div>Loading Bills...</div>;

    return (
        <div className="admin-card">
            <h2 style={{ marginBottom: '20px' }}>Sales History</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: '#64748b' }}>Bill #</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Date</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Total</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Payment</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentItems.map(bill => (
                        <tr key={bill.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{bill.bill_number}</td>
                            <td style={{ padding: '12px' }}>{new Date(bill.created_at).toLocaleString()}</td>
                            <td style={{ padding: '12px' }}>₹{bill.total_amount}</td>
                            <td style={{ padding: '12px' }}>{bill.payment_method}</td>
                            <td style={{ padding: '12px' }}>
                                <button onClick={() => viewBill(bill)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>View Bill</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '10px' }}>
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
                    {[...Array(totalPages)].map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => paginate(idx + 1)}
                            style={{ 
                                padding: '8px 12px', 
                                borderRadius: '6px', 
                                border: '1px solid #10b981', 
                                background: currentPage === idx + 1 ? '#10b981' : 'white', 
                                color: currentPage === idx + 1 ? 'white' : '#10b981',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {idx + 1}
                        </button>
                    ))}
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="receipt-preview-modal">
                    <div className="receipt-content" style={{ background: 'white', width: '320px', padding: '20px', maxHeight: '80vh', overflowY: 'auto', fontFamily: 'monospace' }}>
                        <div style={{ textAlign: 'center' }}>
                            <img src="/Image/Cha_Haus_logo_final-removebg-preview.png" alt="Logo" className="receipt-logo" />
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>CHA HAUS ADMIN</div>
                        </div>
                        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
                        <div style={{ fontSize: '12px' }}>
                            <div>No: {showReceipt.bill_number}</div>
                            <div>Date: {showReceipt.date}</div>
                        </div>
                        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
                        {showReceipt.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                <span>{item.quantity} x {item.name}</span>
                                <span>₹{item.subtotal}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                            <span>Payment Method</span>
                            <span>{showReceipt.payment_method}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>TOTAL</span>
                            <span>₹{showReceipt.total_amount}</span>
                        </div>
                        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }} className="no-print">
                            <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight:'bold' }}>Print</button>
                            <button onClick={() => setShowReceipt(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight:'bold' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
