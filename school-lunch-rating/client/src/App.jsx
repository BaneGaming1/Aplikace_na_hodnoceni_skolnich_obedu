import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Menu from './components/Menu';
import Rating from './components/Rating';
import Login from './components/Login';
import Gallery from './components/Gallery';
import RatingsSummary from './components/RatingSummary';
import './App.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/rating/:id" element={<Rating />} />
        <Route path="/gallery/:id" element={<Gallery />} />
        <Route path="/ratings-summary/:id" element={<RatingsSummary />} />
      </Routes>
    </Router>
  );
};

export default App;