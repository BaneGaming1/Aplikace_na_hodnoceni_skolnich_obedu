import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import Rating from './components/Rating';
import Login from './components/Login';
import './App.css';

const App = () => {
  return (
    <Router>
      <div className="App">
        <h1>Hodnocení školních obědů</h1>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/rating" element={<Rating />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;