import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Menu from './components/Menu';
import Rating from './components/Rating';
import Login from './components/Login';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>Hodnocení obědů</h1>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/rating" element={<Rating />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;