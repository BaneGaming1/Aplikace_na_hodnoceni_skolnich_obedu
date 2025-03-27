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
  const [isICanteenLogin, setIsICanteenLogin] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let response;
      
      if (isICanteenLogin) {
        // iCanteen přihlášení
        console.log('Pokus o iCanteen přihlášení:', credentials.email);
        response = await axios.post('/api/icanteen-login', {
          username: credentials.email,
          password: credentials.password
        });
      } else {
        // Standardní přihlášení
        if (!credentials.email.endsWith('@spsejecna.cz')) {
          setError('Použijte prosím školní email (@spsejecna.cz)');
          setLoading(false);
          return;
        }
  
        const endpoint = isLogin ? 'login' : 'register';
        response = await axios.post(`/api/${endpoint}`, credentials);
      }
      
      if (response.data.success) {
        // Ukládáme údaje do localStorage
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', response.data.email);
        
        // Přesměrování na menu
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

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  const toggleLoginType = () => {
    setIsICanteenLogin(!isICanteenLogin);
    setError('');
    // Reset pole při přepnutí typu přihlášení
    setCredentials({
      email: '',
      password: ''
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>{isICanteenLogin ? 'Přihlášení přes iCanteen' : 'Přihlášení'}</h1>
          <p className="login-subtitle">Systém hodnocení školních obědů</p>
        </div>
        
        <div className="login-form-container">
          {error && <div className="login-error">{error}</div>}
          
          {isICanteenLogin && (
            <div className="icanteen-info" style={{ margin: '10px 0', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '5px', fontSize: '14px' }}>
              Použijte stejné přihlašovací údaje jako do systému jídelny.<br />
              Pro testování můžete použít: <strong>test / test</strong>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{isICanteenLogin ? 'Uživatelské jméno iCanteen' : 'Školní email'}</label>
              <input
                type={isICanteenLogin ? "text" : "email"}
                id="email"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                placeholder={isICanteenLogin ? 'Zadejte uživatelské jméno' : 'jmeno.prijmeni@spsejecna.cz'}
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
              {loading ? 'Prosím čekejte...' : (isICanteenLogin 
                ? 'Přihlásit se přes iCanteen'
                : (isLogin ? 'Přihlásit se' : 'Zaregistrovat se'))}
            </button>
          </form>

          <div className="login-type-toggle" style={{ textAlign: 'center', marginTop: '15px', marginBottom: '10px' }}>
            <button 
              onClick={toggleLoginType} 
              className="toggle-auth-btn"
              type="button"
            >
              {isICanteenLogin ? 'Přepnout na standardní přihlášení' : 'Přepnout na iCanteen přihlášení'}
            </button>
          </div>

          {!isICanteenLogin && (
            <div className="login-footer">
              <p>
                {isLogin ? 'Nemáte účet?' : 'Máte již účet?'} 
                <button onClick={toggleAuthMode} className="toggle-auth-btn">
                  {isLogin ? 'Zaregistrovat se' : 'Přihlásit se'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;