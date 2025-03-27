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
      setError('Zadejte prosím uživatelské jméno a heslo.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // ŽÁDNÉ obcházení ověřování zde
      const response = await axios({
        method: 'POST',
        url: '/api/icanteen-login',
        headers: {
          'Content-Type': 'application/json',
          'X-USERNAME': username,
          'X-PASSWORD': password
        },
        data: {
          username,
          password
        }
      });
      
      // Přihlášení bylo úspěšné POUZE když server vrátí success: true
      if (response.data && response.data.success) {
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', username);
        navigate('/menu');
      } else {
        // Toto by nemělo nikdy nastat, server by měl vracet HTTP chybu při neúspěchu
        setError('Přihlášení selhalo. Zkontrolujte své údaje.');
      }
    } catch (error) {
      console.error('Chyba při přihlašování:', error);
      
      // Server vrátil chybu - NEPOUŠTÍME uživatele dál
      if (error.response?.status === 401) {
        setError('Neplatné přihlašovací údaje. Zkontrolujte své uživatelské jméno a heslo.');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Chyba při komunikaci se serverem. Zkuste to prosím znovu.');
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
          {error && <div className="login-error">{error}</div>}
          
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
              <label htmlFor="username">Přihlašovací jméno iCanteen</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Přihlašovací jméno"
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Heslo</label>
              <input
                type="password"
                id="password"
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