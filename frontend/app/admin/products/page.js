'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('default');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // New Product State
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [newProduct, setNewProduct] = useState({
        name: '', subcategory_id: '', image_url: '', production_cost: '', sales_rate: ''
    });
    const [modalType, setModalType] = useState('add');
    const [editProductId, setEditProductId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodData, subData, catData] = await Promise.all([
                api.get('/admin/products'),
                api.get('/admin/subcategories'),
                api.get('/admin/categories')
            ]);
            
            setProducts(prodData);
            setSubcategories(subData);
            setCategories(catData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            let finalImageUrl = newProduct.image_url;

            // 1. Upload image if selected
            if (selectedFile) {
                const formData = new FormData();
                formData.append('image', selectedFile);
                const uploadData = await api.upload('/admin/upload-image', formData);
                finalImageUrl = uploadData.imageUrl;
            }

            // 2. Add/Update Product
            const endpoint = modalType === 'add' ? '/admin/products' : `/admin/products/${editProductId}`;
            const method = modalType === 'add' ? 'post' : 'put';
            
            const data = await api[method](endpoint, {
                ...newProduct, 
                image_url: finalImageUrl,
                category_id: selectedCategoryId 
            });

            if (data) {
                setShowModal(false);
                setNewProduct({ name: '', subcategory_id: '', image_url: '', production_cost: '', sales_rate: '' });
                setSelectedCategoryId('');
                setEditProductId(null);
                setModalType('add');
                setSelectedFile(null);
                setImagePreview(null);
                fetchData();
            }
        } catch (err) {
            alert(err.message || 'Failed to process product');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/admin/products/${id}`);
            fetchData();
        } catch (err) {
            alert('Error deleting product');
        }
    };

    const handleEditClick = (product) => {
        setModalType('edit');
        setEditProductId(product.id);
        setNewProduct({
            name: product.name,
            subcategory_id: product.subcategory_id || '',
            image_url: product.image_url,
            production_cost: product.production_cost,
            sales_rate: product.sales_rate
        });
        setSelectedCategoryId(product.category_id || '');
        setImagePreview(product.image_url);
        setShowModal(true);
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (sortBy === 'price-low') return a.sales_rate - b.sales_rate;
        if (sortBy === 'price-high') return b.sales_rate - a.sales_rate;
        if (sortBy === 'high-selling') return b.sales_count - a.sales_count;
        return 0;
    });

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const filteredSubcategories = subcategories.filter(s => s.category_id === Number(selectedCategoryId));

    if (loading) return <div>Loading Products & Categories...</div>;

    return (
        <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Inventory Management</h2>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    <Link href="/admin/categories">
                        <button style={{padding:'10px 18px', background:'#fdfaf3', border:'1px solid #be9249', borderRadius:'10px', color:'#be9249', fontWeight:'bold', cursor:'pointer'}}>
                            📁 Manage Categories
                        </button>
                    </Link>
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{padding:'10px', borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'14px', fontWeight:'600'}}
                    >
                        <option value="default">Sort by: Default</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="high-selling">Best Sellers</option>
                    </select>
                    <button className="admin-btn" onClick={() => { setModalType('add'); setNewProduct({name:'', subcategory_id:'', image_url:'', production_cost:'', sales_rate:''}); setSelectedCategoryId(''); setImagePreview(null); setShowModal(true); }}>+ Add New Product</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={{ padding: '12px', color: '#64748b' }}>Image</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Name</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Category</th>
                            <th style={{ padding: '12px', color: '#64748b' }}>Subcategory</th>
                            <th style={{ padding: '12px' }}>Sales</th>
                            <th style={{ padding: '12px' }}>Cost</th>
                            <th style={{ padding: '12px' }}>Price</th>
                            <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px' }}>
                                    <img src={p.image_url || 'https://via.placeholder.com/50'} alt={p.name} style={{ width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' }} />
                                </td>
                                <td style={{ padding: '12px', fontWeight: '600', color: '#1e293b' }}>{p.name}</td>
                                <td style={{ padding: '12px', color: '#64748b' }}>{p.category_name}</td>
                                <td style={{ padding: '12px', color: '#64748b' }}>{p.subcategory_name || '-'}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '20px', background: p.sales_count > 0 ? '#ecfdf5' : '#f1f5f9', color: p.sales_count > 0 ? '#059669' : '#64748b', fontWeight: 'bold', fontSize: '13px' }}>
                                        {p.sales_count} sold
                                    </span>
                                </td>
                                <td style={{ padding: '12px', color: '#64748b' }}>₹{p.production_cost}</td>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: '#be9249' }}>₹{p.sales_rate}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button onClick={() => handleEditClick(p)} style={{ marginRight: '10px', background: 'none', border: 'none', color: '#be9249', cursor: 'pointer', fontWeight: 'bold' }}>Edit</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
                                </td>
                            </tr>
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

            {/* Add Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)'
                }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '500px', maxHeight: '90vh', overflowY:'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h2 style={{marginTop:0, marginBottom:'30px', color:'#1e293b'}}>{modalType === 'add' ? '✨ Add New Product' : '📝 Edit Product'}</h2>
                        <form onSubmit={handleAdd}>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Product Name</label>
                                <input 
                                    type="text" 
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #94a3b8', background: '#ffffff', boxSizing:'border-box', outline:'none', fontSize:'15px', color: '#1e293b' }}
                                    placeholder="e.g. Special Masala Tea"
                                    required 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Category</label>
                                    <select 
                                        value={selectedCategoryId}
                                        onChange={(e) => { setSelectedCategoryId(e.target.value); setNewProduct({...newProduct, subcategory_id: ''}); }}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #94a3b8', background: '#ffffff', boxSizing:'border-box', outline:'none', fontSize:'15px', color: '#1e293b' }}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Subcategory</label>
                                    <select 
                                        value={newProduct.subcategory_id}
                                        onChange={(e) => setNewProduct({ ...newProduct, subcategory_id: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #94a3b8', background: '#ffffff', boxSizing:'border-box', outline:'none', fontSize:'15px', color: '#1e293b' }}
                                        disabled={!selectedCategoryId}
                                    >
                                        <option value="">{selectedCategoryId ? 'None (Optional)' : 'Select Category first'}</option>
                                        {filteredSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Product Photo</label>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ flex: 1 }}>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            id="product-image-upload"
                                        />
                                        <label 
                                            htmlFor="product-image-upload"
                                            style={{ 
                                                display: 'block', 
                                                padding: '14px', 
                                                borderRadius: '12px', 
                                                border: '2px dashed #e2e8f0', 
                                                textAlign: 'center', 
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {selectedFile ? 'Change Photo 🔄' : 'Select Photo 📷'}
                                        </label>
                                    </div>
                                    {imagePreview && (
                                        <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #10b981' }}>
                                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '35px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Production Cost</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={newProduct.production_cost}
                                        onChange={(e) => setNewProduct({ ...newProduct, production_cost: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #94a3b8', background: '#ffffff', boxSizing:'border-box', outline:'none', fontSize:'15px', color: '#1e293b' }}
                                        placeholder="0.00"
                                        required 
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '700', color: '#475569', fontSize: '14px' }}>Sales Price</label>
                                    <input 
                                        type="number" step="0.01"
                                        value={newProduct.sales_rate}
                                        onChange={(e) => setNewProduct({ ...newProduct, sales_rate: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #94a3b8', background: '#ffffff', boxSizing:'border-box', outline:'none', fontSize:'15px', color: '#1e293b' }}
                                        placeholder="0.00"
                                        required 
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button type="submit" className="admin-btn" style={{ flex: 2, padding:'16px', fontSize:'16px' }} disabled={isUploading}>
                                    {isUploading ? 'Saving...' : (modalType === 'add' ? '✨ Add Product' : '💾 Update Product')}
                                </button>
                                <button type="button" onClick={() => { setShowModal(false); setEditProductId(null); setModalType('add'); }} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight:'700', color:'#64748b', cursor:'pointer' }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
