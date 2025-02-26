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
        console.log('Začínám načítat data z:', 'http://localhost:5000/api/meals');
        const response = await axios.get('http://localhost:5000/api/meals');
        console.log('Odpověď ze serveru:', response.data);
        setMenuData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Chyba při načítání:', err);
        setError('Nepodařilo se načíst jídelníček: ' + err.message);
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  if (loading) return <div>Načítání jídelníčku...</div>;
  if (error) return <div style={{color: 'red', padding: '20px'}}>{error}</div>;
  if (!menuData || Object.keys(menuData).length === 0) return <div>Žádná data k zobrazení</div>;

  return (
    <div className="menu-page">
      {Object.entries(menuData).map(([dayTitle, meals]) => (
        <div key={dayTitle} className="day-block">
          <h2 className="day-heading">{dayTitle}</h2>
          <div className="meals-list">
            {meals && meals.length > 0 ? (
              meals.map((meal) => (
                <div key={meal.id} className="meal-card">
                  <h3>{meal.type}</h3>
                  <p className="meal-name">{meal.name}</p>
                  <button onClick={() => navigate(`/rating/${meal.id}`)}>
                    Ohodnotit
                  </button>
                </div>
              ))
            ) : (
              <p>Žádná jídla pro tento den</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Menu;