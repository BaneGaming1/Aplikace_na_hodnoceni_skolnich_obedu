import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Zadejte přihlašovací údaje');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Pokus o přihlášení
      const response = await axios.post('/api/icanteen-login', { 
        username, 
        password 
      });
      
      if (response.data.success) {
        // Přihlášení uspělo
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', username);
        navigate('/menu');
      } else {
        // Přihlášení selhalo
        setError('Přihlášení selhalo');
      }
    } catch (error) {
      console.error('Chyba:', error);
      
      // Zobrazení chyby z API nebo obecné chyby
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Neplatné přihlašovací údaje');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Přihlášení do systému</h1>
          <p className="login-subtitle">Hodnocení školních obědů</p>
        </div>
        
        <div className="login-form-container">
          {error && (
            <div className="login-error" style={{ 
              padding: '12px', 
              background: '#ffebee', 
              color: '#d32f2f',
              borderRadius: '4px',
              marginBottom: '15px' 
            }}>
              {error}
            </div>
          )}
          
          <div style={{
            margin: '10px 0',
            padding: '12px',
            backgroundColor: '#f0f8ff',
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            Pro přihlášení použijte vaše přihlašovací údaje do systému iCanteen.<br />
            Pro testování můžete použít: <strong>test / test</strong>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Přihlašovací jméno iCanteen</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Přihlašovací jméno"
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label>Heslo</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Heslo"
                required
                className="login-input"
              />
            </div>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="remember_me"
              />
              <label htmlFor="remember_me" style={{ margin: 0 }}>
                Neodhlašovat mě na tomto počítači.
              </label>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Přihlašování...' : 'Přihlásit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;