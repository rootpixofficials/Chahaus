'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function SubcategoriesPage() {
    const [subcategories, setSubcategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newSub, setNewSub] = useState({ name: '', category_id: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = Cookies.get('token');
            const [subRes, catRes] = await Promise.all([
                fetch('http://localhost:5000/api/admin/subcategories', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/admin/categories', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (subRes.ok) setSubcategories(await subRes.json());
            if (catRes.ok) setCategories(await catRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = Cookies.get('token');
            const res = await fetch('http://localhost:5000/api/admin/subcategories', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newSub)
            });
            if (res.ok) {
                setShowModal(false);
                setNewSub({ name: '', category_id: '' });
                fetchData();
            }
        } catch (err) {
            alert('Failed to add subcategory');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Subcategories</h2>
                <button className="admin-btn" onClick={() => setShowModal(true)}>+ Add Subcategory</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: '#64748b' }}>ID</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Parent Category</th>
                        <th style={{ padding: '12px', color: '#64748b' }}>Name</th>
                    </tr>
                </thead>
                <tbody>
                    {subcategories.map(sub => (
                        <tr key={sub.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px' }}>{sub.id}</td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{sub.category_name}</td>
                            <td style={{ padding: '12px', fontWeight: '500' }}>{sub.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '350px' }}>
                        <h3>Add Subcategory</h3>
                        <form onSubmit={handleAdd}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Parent Category</label>
                                <select 
                                    value={newSub.category_id}
                                    onChange={(e) => setNewSub({ ...newSub, category_id: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Subcategory Name</label>
                                <input 
                                    type="text" 
                                    value={newSub.name}
                                    onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" className="admin-btn" style={{ flex: 1 }}>Save</button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#e2e8f0', border: 'none', borderRadius: '8px' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
