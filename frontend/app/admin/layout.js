'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import './admin.css';

export default function AdminLayout({ children }) {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout from Admin Panel?')) {
        Cookies.remove('token');
        Cookies.remove('role');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    }
  };

  return (
    <div className="admin-container">
      <main className="admin-main">
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <img src="/Image/Cha_Haus_logo_final-removebg-preview.png" alt="Logo" style={{height:'40px', width:'auto', objectFit:'contain'}} />
            <h1 style={{fontSize:'20px', margin:0}}>Cha Haus Admin</h1>
          </div>
          <button 
            onClick={handleLogout}
            style={{ color: '#ef4444', background: 'none', border: '1px solid #fee2e2', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout 🚪
          </button>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>

      <nav className="admin-bottom-bar">
        <Link href="/admin" className="bottom-nav-item">
          <span className="nav-icon">📊</span>
          <span className="nav-text">Stats</span>
        </Link>
        <Link href="/admin/reports" className="bottom-nav-item">
          <span className="nav-icon">📈</span>
          <span className="nav-text">Reports</span>
        </Link>
        <Link href="/admin/products" className="bottom-nav-item">
          <span className="nav-icon">🛍️</span>
          <span className="nav-text">Products</span>
        </Link>
        <Link href="/admin/bills" className="bottom-nav-item">
          <span className="nav-icon">🧾</span>
          <span className="nav-text">Bills</span>
        </Link>
      </nav>
    </div>
  );
}
