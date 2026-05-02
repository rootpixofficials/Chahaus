'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    products: 0, 
    categories: 0, 
    bills: 0, 
    sales: 0,
    topProduct: 'N/A',
    topQty: 0,
    bottomProduct: 'N/A',
    bottomQty: 0
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = Cookies.get('token');
      const [statsRes, chartRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/admin/chart-data', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (chartRes.ok) setChartData(await chartRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const maxSales = Math.max(...chartData.map(d => Number(d.total)), 100);

  if (loading) return <div>Loading Dashboard...</div>;

  return (
    <div>
      {/* Matrix Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="admin-card" style={{ textAlign: 'center', background:'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border:'1px solid #bbf7d0' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>💰</div>
          <div style={{ color: '#166534', fontSize: '14px', fontWeight: '800', textTransform:'uppercase', letterSpacing:'1px' }}>Total Sales Revenue</div>
          <div style={{ fontSize: '36px', fontWeight: '900', color: '#15803d', margin:'10px 0' }}>₹{Number(stats.sales).toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight:'600' }}>Lifetime earnings</div>
        </div>
        <div className="admin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧾</div>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Total Orders</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>{stats.bills}</div>
        </div>
        <div className="admin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛍️</div>
          <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Products Active</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>{stats.products}</div>
        </div>
      </div>

      {/* Sales Graph */}
      <div className="admin-card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Sales Performance (Last 7 Days)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '250px', gap: '20px', padding: '20px 0', borderBottom: '2px solid #e2e8f0' }}>
          {chartData.length > 0 ? chartData.map((day, idx) => {
            const height = (Number(day.total) / maxSales) * 100;
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#10b981' }}>₹{Math.round(day.total)}</div>
                <div style={{ 
                  width: '100%', 
                  height: `${height}%`, 
                  background: 'linear-gradient(to top, #10b981, #34d399)', 
                  borderRadius: '8px 8px 0 0',
                  minHeight: '5px',
                  transition: 'height 0.5s ease'
                }}></div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', transform: 'rotate(-45deg)', marginTop:'10px' }}>
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
              </div>
            );
          }) : (
            <div style={{ width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center', color:'#94a3b8' }}>
              No sales data for the last 7 days
            </div>
          )}
        </div>
      </div>

      {/* Product Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="admin-card" style={{ borderLeft: '6px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '40px' }}>🏆</div>
            <div>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Highest Selling Product</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>{stats.topProduct}</div>
              <div style={{ fontSize: '14px', color: '#10b981', fontWeight: '700' }}>Total Sold: {stats.topQty}</div>
            </div>
          </div>
        </div>
        <div className="admin-card" style={{ borderLeft: '6px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '40px' }}>📉</div>
            <div>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Lowest Selling Product</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>{stats.bottomProduct}</div>
              <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: '700' }}>Total Sold: {stats.bottomQty}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
