import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
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
      const response = await axios.post('http://localhost:5000/api/login', credentials);
      
      if (response.data.success) {
        // Uložíme ID uživatele do localStorage pro další použití
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', credentials.email);
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
      <div className="login-box">
        <h1>Přihlášení</h1>
        <p className="subtitle">Systém hodnocení školních obědů</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              placeholder="Školní email"
              required
              className="login-input"
            />
          </div>

          <div className="input-group">
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Heslo"
              required
              className="login-input"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Přihlašování...' : 'Přihlásit se'}
          </button>
        </form>

        <p className="login-info">
          Pro testovací účely můžete použít jakýkoliv email a heslo.
          <br />
          V produkční verzi by zde byla integrace s Office 365.
        </p>
      </div>
    </div>
  );
};

export default Login;