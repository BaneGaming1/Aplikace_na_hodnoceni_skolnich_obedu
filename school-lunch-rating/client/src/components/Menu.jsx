import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Menu = () => {
  const navigate = useNavigate();
  const [meals] = useState([
    { id: 1, name: 'Kuřecí řízek s bramborovou kaší' },
    { id: 2, name: 'Svíčková na smetaně' },
    { id: 3, name: 'Boloňské špagety' }
  ]);

  return (
    <div className="menu-page">
      <h1 className="menu-title">Dnešní menu</h1>
      <div className="meals-grid">
        {meals.map(meal => (
          <div key={meal.id} className="meal-card">
            <div className="meal-image">
              <div className="placeholder-image"></div>
            </div>
            <div className="meal-content">
              <h3 className="meal-name">{meal.name}</h3>
              <div className="rating-stars">
                <span className="star">★</span>
                <span className="star">★</span>
                <span className="star">★</span>
              </div>
              <button 
                className="rate-button"
                onClick={() => navigate(`/rating/${meal.id}`)}
              >
                Ohodnotit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;