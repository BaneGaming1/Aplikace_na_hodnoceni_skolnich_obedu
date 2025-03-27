import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    remember_me: false
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Odesílá přesně ve formátu, který iCanteen očekává
      const formData = {
        j_username: credentials.username,
        j_password: credentials.password
      };
      
      if (credentials.remember_me) {
        formData._spring_security_remember_me = 'on';
      }
      
      // Testovací přihlášení
      if (credentials.username === 'test' && credentials.password === 'test') {
        localStorage.setItem('userId', 'test-user');
        localStorage.setItem('userEmail', 'test');
        navigate('/menu');
        return;
      }
      
      // Odeslání na server, který komunikuje s iCanteen
      const response = await axios.post('/api/icanteen-login', formData);
      
      if (response.data && response.data.success) {
        // Úspěšné přihlášení
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', response.data.username);
        navigate('/menu');
      } else {
        // Neúspěšné přihlášení, ale server odpověděl
        setError(response.data?.error || 'Přihlášení se nezdařilo');
      }
    } catch (error) {
      console.error('Chyba při přihlašování:', error);
      
      if (error.response?.status === 401) {
        setError('Neplatné přihlašovací údaje');
      } else if (error.response?.data?.error) {
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
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
          
          {/* Informace pro testování */}
          <div className="login-info">
            Pro přihlášení použijte vaše přihlašovací údaje do systému iCanteen.<br />
            Pro testování můžete použít: <strong>test / test</strong>
          </div>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Přihlašovací jméno iCanteen</label>
              <input
                type="text"
                id="j_username"
                name="j_username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                placeholder="Přihlašovací jméno"
                required
                className="login-input form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Heslo</label>
              <input
                type="password"
                id="j_password"
                name="j_password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Heslo"
                required
                className="login-input form-control"
                autoComplete="current-password"
              />
            </div>
            
            <div className="form-group remember-me">
              <input
                type="checkbox"
                id="_spring_security_remember_me"
                name="_spring_security_remember_me"
                checked={credentials.remember_me}
                onChange={(e) => setCredentials({...credentials, remember_me: e.target.checked})}
                className="checkbox-inline"
              />
              <label htmlFor="_spring_security_remember_me">
                Neodhlašovat mě na tomto počítači.
              </label>
            </div>

            <button 
              type="submit" 
              className="login-button btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Přihlašování...' : 'Přihlásit'}
            </button>
          </form>

          <div className="login-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); }}>
              Obnovit zapomenuté heslo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;