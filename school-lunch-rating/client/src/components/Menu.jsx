import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Menu = () => {
  const [meals] = useState([
    { id: 1, name: 'Oběd 1' },
    { id: 2, name: 'Oběd 2' },
    { id: 3, name: 'Oběd 3' }
  ]);
  const navigate = useNavigate();

  return (
    <div className="menu-container">
      <h2>Obědy</h2>
      <div className="menu-grid">
        {meals.map(meal => (
          <div key={meal.id} className="menu-item">
            <h3>{meal.name}</h3>
            <button onClick={() => navigate(`/rating?id=${meal.id}`)}>
              Hodnotit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;