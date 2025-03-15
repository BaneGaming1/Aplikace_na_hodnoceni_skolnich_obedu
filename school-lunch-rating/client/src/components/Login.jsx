import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Validace emailu
    if (!credentials.email.endsWith('@spsejecna.cz')) {
      setError('Musíte použít školní email (@spsejecna.cz)');
      setLoading(false);
      return;
    }

    // Validace hesla při registraci
    if (!isLogin && credentials.password !== credentials.confirmPassword) {
      setError('Hesla se neshodují');
      setLoading(false);
      return;
    }
    
    try {
      // Přihlášení nebo registrace podle aktuálního režimu
      const endpoint = isLogin ? '/api/login' : '/api/register';
      
      const response = await axios.post(`http://localhost:5000${endpoint}`, {
        email: credentials.email,
        password: credentials.password
      });
      
      if (response.data.success) {
        if (isLogin) {
          // Při přihlášení uložíme data a přesměrujeme na jídelníček
          localStorage.setItem('userId', response.data.userId);
          localStorage.setItem('userEmail', credentials.email);
          navigate('/menu');
        } else {
          // Při úspěšné registraci zobrazíme zprávu a přepneme na přihlášení
          setSuccess('Registrace proběhla úspěšně! Nyní se můžete přihlásit.');
          setIsLogin(true);
          setCredentials({
            ...credentials,
            password: '',
            confirmPassword: ''
          });
        }
      }
    } catch (error) {
      console.error('Chyba:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError(isLogin 
          ? 'Nepodařilo se přihlásit. Zkuste to prosím později.' 
          : 'Nepodařilo se zaregistrovat. Zkuste to prosím později.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>{isLogin ? 'Přihlášení' : 'Registrace'}</h1>
        <p className="subtitle">Systém hodnocení školních obědů</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              placeholder="Školní email (@spsejecna.cz)"
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

        <div className="switch-mode">
          <p>
            {isLogin 
              ? 'Nemáte účet?' 
              : 'Již máte účet?'} 
            <button 
              onClick={switchMode}
              className="switch-button"
            >
              {isLogin ? 'Zaregistrujte se' : 'Přihlaste se'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;