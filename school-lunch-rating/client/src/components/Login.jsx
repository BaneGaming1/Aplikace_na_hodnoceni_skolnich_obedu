import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/menu');
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Přihlášení</h1>
        <p className="subtitle">Systém hodnocení školních obědů</p>
        
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

          <button type="submit" className="login-button">
            Přihlásit se
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;