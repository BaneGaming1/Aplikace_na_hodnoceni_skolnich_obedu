import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validace školního emailu
      if (!email.toLowerCase().endsWith('@spsejecna.cz')) {
        setError('Přístup je povolen pouze s emailem domény @spsejecna.cz');
        setLoading(false);
        return;
      }

      // Pokus o přihlášení
      const response = await axios.post('http://localhost:5000/api/login', { 
        email, 
        password 
      });
      
      if (response.data.success) {
        // Přihlášení úspěšné
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userEmail', email);
        navigate('/menu');
      } else {
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
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Školní email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas.email@spsejecna.cz"
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

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Přihlašování...' : 'Přihlásit'}
            </button>
          </form>
          
          <div className="login-footer">
            <p>
              Přihlaste se svým školním emailem @spsejecna.cz
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;