import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); // true = login, false = registrace
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    confirmPassword: '' // pro registraci
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Přihlášení uživatele - PŮVODNÍ FUNKCE, ZACHOVÁNO
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: credentials.email,
        password: credentials.password
      });
      
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

  // Registrace uživatele
  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validace hesla
    if (credentials.password !== credentials.confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        email: credentials.email,
        password: credentials.password
      });
      
      if (response.data.success) {
        // Uložíme ID uživatele a přesměrujeme
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', credentials.email);
        navigate('/menu');
      }
    } catch (error) {
      console.error('Chyba při registraci:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Nepodařilo se zaregistrovat. Zkuste to prosím později.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>{isLogin ? 'Přihlášení' : 'Registrace'}</h1>
        <p className="subtitle">Systém hodnocení školních obědů</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={isLogin ? handleLogin : handleRegister}>
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

          {!isLogin && (
            <div className="input-group">
              <input
                type="password"
                value={credentials.confirmPassword}
                onChange={(e) => setCredentials({...credentials, confirmPassword: e.target.value})}
                placeholder="Potvrzení hesla"
                required
                className="login-input"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading 
              ? (isLogin ? 'Přihlašování...' : 'Registrace...') 
              : (isLogin ? 'Přihlásit se' : 'Zaregistrovat se')}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? 'Nemáte účet?' : 'Již máte účet?'}
          <button 
            onClick={toggleAuthMode} 
            className="toggle-button"
          >
            {isLogin ? 'Zaregistrovat se' : 'Přihlásit se'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;