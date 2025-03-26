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
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validace školní domény
      if (!credentials.email.endsWith('@spsejecna.cz')) {
        setError('Použijte prosím školní email (@spsejecna.cz)');
        setLoading(false);
        return;
      }

      const endpoint = isLogin ? 'login' : 'register';
      const response = await axios.post(`/api/${endpoint}`, credentials);
      
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
        setError(isLogin ? 'Nepodařilo se přihlásit. Zkuste to prosím později.' : 'Nepodařilo se zaregistrovat. Zkuste to prosím později.');
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
      <div className="login-container">
        <div className="login-header">
          <h1>Přihlášení</h1>
          <p className="login-subtitle">Systém hodnocení školních obědů</p>
        </div>
        
        <div className="login-form-container">
          {error && <div className="login-error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Školní email</label>
              <input
                type="email"
                id="email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                placeholder="jmeno.prijmeni@spsejecna.cz"
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
                placeholder="Zadejte heslo"
                required
                className="login-input"
              />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Prosím čekejte...' : (isLogin ? 'Přihlásit se' : 'Zaregistrovat se')}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {isLogin ? 'Nemáte účet?' : 'Máte již účet?'} 
              <button onClick={toggleAuthMode} className="toggle-auth-btn">
                {isLogin ? 'Zaregistrovat se' : 'Přihlásit se'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;