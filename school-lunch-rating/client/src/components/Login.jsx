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
      // Pokusíme se přihlásit do systému iCanteen
      const response = await axios.post('http://localhost:5000/api/icanteen-login', credentials);
      
      if (response.data.success) {
        // Přihlášení bylo úspěšné
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', response.data.username || response.data.email);
        navigate('/menu');
      } else {
        setError(response.data.error || 'Přihlášení se nezdařilo');
      }
    } catch (error) {
      console.error('Chyba při přihlašování:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Chyba při komunikaci se serverem. Zkuste to prosím později.');
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
          
          <div className="login-info" style={{
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
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Vaše přihlašovací jméno"
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
                placeholder="Vaše heslo do iCanteen"
                required
                className="login-input"
              />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Ověřuji přihlášení...' : 'Přihlásit se'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Použijte své přihlašovací údaje ze systému školní jídelny.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;