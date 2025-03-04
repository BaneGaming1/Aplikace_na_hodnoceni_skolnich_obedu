import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Menu = () => {
  const navigate = useNavigate();
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Kontrola, zda je uživatel přihlášen
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchMeals = async () => {
      try {
        // Získáme data o jídlech z API
        const response = await axios.get('http://localhost:5000/api/meals');
        
        // Zpracujeme data a přidáme číselná ID
        const processedData = {};
        let counter = 1;
        
        Object.entries(response.data).forEach(([date, meals]) => {
          // Filtrujeme pouze obědy a odstraňujeme duplicity
          const uniqueMeals = [];
          const mealTypes = new Set();
          
          meals.forEach(meal => {
            if (meal.type.includes('Oběd') && !mealTypes.has(meal.type)) {
              mealTypes.add(meal.type);
              uniqueMeals.push({
                ...meal,
                // Generujeme číselné ID pro každé jídlo
                id: counter++
              });
            }
          });
          
          if (uniqueMeals.length > 0) {
            processedData[date] = uniqueMeals;
          }
        });
        
        setMenuData(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Chyba při načítání:', err);
        setError('Nepodařilo se načíst jídelníček. Zkuste to prosím později.');
        setLoading(false);
      }
    };

    fetchMeals();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Načítání jídelníčku...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container">
      <p className="error-message">{error}</p>
      <button 
        className="retry-button"
        onClick={() => window.location.reload()}
      >
        Zkusit znovu
      </button>
    </div>
  );

  // Pokud nejsou žádná data
  if (Object.keys(menuData).length === 0) {
    return (
      <div className="no-data-container">
        <p>Pro tento týden nejsou k dispozici žádná data o jídelníčku.</p>
        <button onClick={handleLogout} className="logout-button">
          Odhlásit se
        </button>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <div className="menu-header">
        <h1>Jídelníček</h1>
        <div className="user-info">
          <p>Přihlášen jako: {localStorage.getItem('userEmail')}</p>
          <button onClick={handleLogout} className="logout-button">
            Odhlásit se
          </button>
        </div>
      </div>

      {Object.entries(menuData).sort().map(([dayTitle, meals]) => {
        return (
          <div key={dayTitle} className="day-block">
            <h2 className="day-heading">{dayTitle}</h2>
            <div className="meals-list">
              {meals.map((meal) => (
                <div key={meal.id} className="meal-card">
                  <h3>{meal.type}</h3>
                  <p className="meal-name">{meal.name}</p>
                  <button
                    className="rate-button"
                    onClick={() => navigate(`/rating/${meal.id}`, { 
                      state: { meal, dayTitle } 
                    })}
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