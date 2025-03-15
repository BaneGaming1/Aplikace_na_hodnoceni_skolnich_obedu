import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Menu from './components/Menu';
import Rating from './components/Rating';
import Login from './components/Login';
import Gallery from './components/Gallery';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/rating/:id" element={<Rating />} />
        <Route path="/gallery/:id" element={<Gallery />} />
      </Routes>
    </Router>
  );
};

export default App;