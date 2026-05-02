'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store JWT token and role securely in cookies
      Cookies.set('token', data.token, { expires: 1 }); // 1 day expiration
      Cookies.set('role', data.role, { expires: 1 });

      // Redirect based on role
      if (data.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '40px 30px',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#ecfdf5',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 20px auto',
          fontSize: '32px'
        }}>
          🍵
        </div>
        <h2 style={{
          color: '#064e3b',
          fontSize: '28px',
          fontWeight: '800',
          margin: '0 0 8px 0'
        }}>Welcome Back</h2>
        <p style={{
          color: '#64748b',
          margin: '0 0 32px 0',
          fontSize: '15px'
        }}>Please sign in to your account</p>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#ef4444',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '14px', fontWeight: '600' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                background: '#ffffff',
                outline: 'none',
                fontSize: '15px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                color: '#1e293b'
              }} 
              required 
            />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontSize: '14px', fontWeight: '600' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                background: '#ffffff',
                outline: 'none',
                fontSize: '15px',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                color: '#1e293b'
              }} 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#94a3b8' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
              transition: 'transform 0.1s, background-color 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
