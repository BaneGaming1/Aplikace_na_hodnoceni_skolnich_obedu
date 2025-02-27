// src/components/Menu.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Menu = () => {
  const navigate = useNavigate();
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/meals');
        setMenuData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Chyba při načítání:', err);
        setError('Nepodařilo se načíst jídelníček');
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  if (loading) return <div>Načítání jídelníčku...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="menu-page">
      {Object.entries(menuData).map(([dayTitle, meals]) => {
        const uniqueTypes = [...new Set(meals.map(meal => meal.type))];
        const filteredMeals = uniqueTypes.slice(0, 2).map(type => {
          return meals.find(meal => meal.type === type);
        }).filter(Boolean);

        return (
          <div key={dayTitle} className="day-block">
            <h2 className="day-heading">{dayTitle}</h2>
            <div className="meals-list">
              {filteredMeals.map((meal) => (
                <div key={meal.id} className="meal-card">
                  <h3>{meal.type}</h3>
                  <p className="meal-name">{meal.name}</p>
                  <button 
                    className="rate-button"
                    onClick={() => navigate(`/rating/${meal.id}`)}
                  >
                    Ohodnotit
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Menu;