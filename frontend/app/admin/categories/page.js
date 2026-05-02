'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function CategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showSubModal, setShowSubModal] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add', 'edit', 'editSub'
    const [currentCategory, setCurrentCategory] = useState({ id: null, name: '' });
    const [currentSub, setCurrentSub] = useState({ id: null, name: '' });
    const [newSub, setNewSub] = useState({ name: '', category_id: null, category_name: '' });
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await api.get('/admin/categories');
            setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        if (expandedRows.includes(id)) {
            setExpandedRows(expandedRows.filter(rowId => rowId !== id));
        } else {
            setExpandedRows([...expandedRows, id]);
        }
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = modalType === 'add' ? '/admin/categories' : `/admin/categories/${currentCategory.id}`;
            const method = modalType === 'add' ? 'post' : 'put';
            const data = await api[method](endpoint, { name: currentCategory.name });

            if (data) {
                setShowModal(false);
                setCurrentCategory({ id: null, name: '' });
                fetchCategories();
            }
        } catch (err) {
            alert('Failed to save category');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this category? All related products will also be affected.')) return;
        try {
            await api.delete(`/admin/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const handleSubSubmit = async (e) => {
        e.preventDefault();
        const isEdit = modalType === 'editSub';
        const endpoint = isEdit ? `/admin/subcategories/${currentSub.id}` : '/admin/subcategories';
        const method = isEdit ? 'put' : 'post';
        const body = isEdit ? { name: currentSub.name } : { name: newSub.name, category_id: newSub.category_id };

        try {
            const data = await api[method](endpoint, body);
            if (data) {
                setShowSubModal(false);
                setNewSub({ name: '', category_id: null, category_name: '' });
                setCurrentSub({ id: null, name: '' });
                fetchCategories();
            }
        } catch (err) {
            alert('Failed to save subcategory');
        }
    };

    const handleDeleteSub = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Delete this subcategory?')) return;
        try {
            await api.delete(`/admin/subcategories/${id}`);
            fetchCategories();
        } catch (err) {
            alert('Delete failed');
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(categories.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = categories.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Category Management</h2>
                <button className="admin-btn" onClick={() => { setModalType('add'); setCurrentCategory({ id: null, name: '' }); setShowModal(true); }}>
                    + New Category
                </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '15px', width: '40px' }}></th>
                            <th style={{ padding: '15px' }}>Category Name</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Sub</th>
                            <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(cat => (
                            <React.Fragment key={cat.id}>
                                <tr 
                                    onClick={() => toggleRow(cat.id)}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: expandedRows.includes(cat.id) ? '#f8fafc' : 'transparent' }}
                                >
                                    <td style={{ padding: '15px', textAlign: 'center' }}>{expandedRows.includes(cat.id) ? '▼' : '▶'}</td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>{cat.name}</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                            {cat.subcategories.map(sub => (
                                                <span 
                                                    key={sub.id} 
                                                    style={{ background: '#fdfaf3', color: '#be9249', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: '1px solid #f97316' }}
                                                >
                                                    {sub.name}
                                                </span>
                                            ))}
                                            {cat.subcategories.length === 0 && <span style={{fontSize:'11px', color:'#94a3b8', fontStyle:'italic'}}>No subcategories</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setNewSub({ ...newSub, category_id: cat.id, category_name: cat.name }); setModalType('addSub'); setShowSubModal(true); }}
                                            style={{ padding: '8px 16px', background: '#be9249', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                        >
                                            + Sub
                                        </button>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'center' }}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setModalType('edit'); setCurrentCategory(cat); setShowModal(true); }}
                                            style={{ marginRight: '15px', background: 'none', border: 'none', color: '#be9249', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                                {expandedRows.includes(cat.id) && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '0 15px 15px 55px', background: '#f8fafc' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                                                {cat.subcategories.map(sub => (
                                                    <div 
                                                        key={sub.id} 
                                                        style={{ background: 'white', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    >
                                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{sub.name}</span>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                onClick={() => { setCurrentSub(sub); setModalType('editSub'); setShowSubModal(true); }}
                                                                style={{ border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Edit</button>
                                                            <button 
                                                                onClick={(e) => handleDeleteSub(e, sub.id)}
                                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Del</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', gap: '10px' }}>
                    <button 
                        onClick={() => paginate(currentPage - 1)} 
                        disabled={currentPage === 1} 
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                        ← Prev
                    </button>
                    {[...Array(totalPages)].map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => paginate(idx + 1)} 
                            style={{ 
                                padding: '8px 12px', 
                                borderRadius: '8px', 
                                border: `1px solid ${currentPage === idx + 1 ? '#be9249' : '#e2e8f0'}`, 
                                background: currentPage === idx + 1 ? '#be9249' : 'white', 
                                color: currentPage === idx + 1 ? 'white' : '#be9249', 
                                fontWeight: 'bold', 
                                cursor: 'pointer' 
                            }}
                        >
                            {idx + 1}
                        </button>
                    ))}
                    <button 
                        onClick={() => paginate(currentPage + 1)} 
                        disabled={currentPage === totalPages} 
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Category Modal (Add/Edit) */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>{modalType === 'add' ? 'Create New Category' : 'Edit Category'}</h3>
                        <form onSubmit={handleCategorySubmit}>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Name</label>
                                <input 
                                    type="text" 
                                    value={currentCategory.name}
                                    onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#ffffff', outline: 'none', boxSizing: 'border-box', color: '#1e293b' }}
                                    placeholder="e.g. Hot Drinks"
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="admin-btn" style={{ flex: 1, padding: '12px' }}>{modalType === 'add' ? 'Create' : 'Save Changes'}</button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Subcategory Modal (Add/Edit) */}
            {showSubModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000
                }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '380px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b' }}>{modalType === 'editSub' ? 'Edit Subcategory' : 'Add Subcategory'}</h3>
                        {modalType !== 'editSub' && <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>Under: <span style={{ fontWeight: 'bold', color: '#059669' }}>{newSub.category_name}</span></p>}
                        <form onSubmit={handleSubSubmit}>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Name</label>
                                <input 
                                    type="text" 
                                    value={modalType === 'editSub' ? currentSub.name : newSub.name}
                                    onChange={(e) => modalType === 'editSub' ? setCurrentSub({ ...currentSub, name: e.target.value }) : setNewSub({ ...newSub, name: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#ffffff', outline: 'none', boxSizing: 'border-box', color: '#1e293b' }}
                                    placeholder="e.g. Milk Tea"
                                    required 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="admin-btn" style={{ flex: 1, padding: '12px' }}>{modalType === 'editSub' ? 'Update' : 'Add Sub'}</button>
                                <button type="button" onClick={() => setShowSubModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#64748b', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
