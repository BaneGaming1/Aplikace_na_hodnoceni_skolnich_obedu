import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import Rating from './components/Rating';
import Login from './components/Login';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/rating/:id" element={<Rating />} />
      </Routes>
    </Router>
  );
};

export default App;