'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function ReportsPage() {
    const [chartData, setChartData] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const [statsData, chartData] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/chart-data')
            ]);
            
            setStats(statsData);
            setChartData(chartData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const maxSales = Math.max(...chartData.map(d => Number(d.total)), 100);

    if (loading) return <div>Generating Reports...</div>;

    return (
        <div className="admin-card">
            <h2 style={{marginBottom:'30px'}}>📈 Business Reports</h2>

            {/* Sales Chart */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Weekly Sales Performance</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '300px', gap: '20px', padding: '20px', borderBottom: '2px solid #e2e8f0', background:'#f8fafc', borderRadius:'16px' }}>
                    {chartData.map((day, idx) => {
                        const height = (Number(day.total) / maxSales) * 100;
                        return (
                            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', height:'100%', justifyContent:'flex-end' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#be9249' }}>₹{Math.round(day.total)}</div>
                                <div style={{ 
                                    width: '100%', 
                                    height: `${height}%`, 
                                    background: 'linear-gradient(to top, #be9249, #dfbd7a)', 
                                    borderRadius: '8px 8px 0 0',
                                    minHeight: '4px',
                                    transition: 'height 0.5s ease'
                                }}></div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', transform: 'rotate(-45deg)', marginTop:'15px', whiteSpace:'nowrap' }}>
                                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#fdfaf3', padding: '20px', borderRadius: '16px', border: '1px solid #be9249' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#be9249' }}>Top Selling Strategy</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#85642a' }}>
                        Your top product is <strong>{stats?.topProduct}</strong> with <strong>{stats?.topQty}</strong> sales. 
                        Consider increasing stock or creating a bundle with <strong>{stats?.bottomProduct}</strong> to drive more sales.
                    </p>
                </div>
                <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>Revenue Summary</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#1d4ed8' }}>
                        Total revenue to date is <strong>₹{Number(stats?.sales).toLocaleString()}</strong>. 
                        Average daily sales based on this week is <strong>₹{Math.round(chartData.reduce((a,b) => a + Number(b.total), 0) / 7).toLocaleString()}</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
