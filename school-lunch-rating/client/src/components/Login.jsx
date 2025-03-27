import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Volání API pro ověření přihlášení proti iCanteen
      const response = await axios.post('/api/icanteen-login', {}, {
        headers: {
          'X-USERNAME': credentials.username,
          'X-PASSWORD': credentials.password
        }
      });
      
      if (response.data.success) {
        // Uložíme ID uživatele do localStorage pro další použití
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', credentials.username);
        navigate('/menu');
      }
    } catch (error) {
      console.error('Chyba při přihlašování:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Nepodařilo se přihlásit. Zkuste to prosím později.');
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
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Přihlašovací jméno iCanteen</label>
              <input
                type="text"
                id="username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Zadejte přihlašovací jméno do jídelny"
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Heslo</label>
              <input
                type="password"
                id="password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Zadejte heslo do jídelny"
                required
                className="login-input"
              />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Prosím čekejte...' : 'Přihlásit se'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Použijte stejné přihlašovací údaje jako do systému školní jídelny.
            </p>
            <p>
              Pro testování můžete použít: test / test
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;