// src/components/Menu.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Menu = () => {
  const navigate = useNavigate();
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/meals');
        setMenuData(response.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  if (loading) return <div>Načítání...</div>;

  return (
    <div className="menu-page">
      {Object.entries(menuData).map(([day, meals]) => (
        <div key={day} className="day-block">
          <h2 className="day-heading">{day}</h2>
          <div className="meals-list">
            {meals.map((meal) => (
              <div key={meal.id} className="meal-card">
                <h3>{meal.type}</h3>
                <p>{meal.name}</p>
                <button onClick={() => navigate(`/rating/${meal.id}`)}>
                  Ohodnotit
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Menu;