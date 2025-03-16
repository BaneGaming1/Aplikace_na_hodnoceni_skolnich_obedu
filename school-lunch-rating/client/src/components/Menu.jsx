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
        
        // Odfiltrujeme duplicity a setřídíme data podle data
        const cleanedData = removeDuplicateMeals(response.data);
        const sortedData = sortMenuDataByDate(cleanedData);
        
        setMenuData(sortedData);
        setLoading(false);
      } catch (err) {
        console.error('Chyba při načítání:', err);
        setError('Nepodařilo se načíst jídelníček. Zkuste to prosím později.');
        setLoading(false);
      }
    };

    fetchMeals();
  }, [navigate]);

  // Funkce pro odstranění duplicit jídel
  const removeDuplicateMeals = (data) => {
    const cleanedData = {};
    
    for (const dateText in data) {
      // Pro každý den vytvoříme mapu typů jídel
      const typeMap = new Map();
      
      // Projdeme všechna jídla pro daný den
      data[dateText].forEach(meal => {
        // Pokud tento typ jídla ještě nebyl zpracován, přidáme ho
        if (!typeMap.has(meal.type)) {
          typeMap.set(meal.type, meal);
        }
      });
      
      // Převedeme mapu zpět na pole jídel
      cleanedData[dateText] = Array.from(typeMap.values());
    }
    
    return cleanedData;
  };

  // Funkce pro řazení jídelníčku podle data
  const sortMenuDataByDate = (data) => {
    // Vytvoříme pole pro řazení
    const dateArray = [];
    
    // Získáme aktuální datum (bez času)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Projdeme všechny dny v jídelníčku
    for (const dateText in data) {
      // Extrahujeme DD.MM.YYYY z textu (ignorujeme den v týdnu)
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Měsíce v JS jsou 0-indexed
        const year = parseInt(dateMatch[3], 10);
        
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);
        
        // Vypočítáme, o kolik dní se liší od dnešního dne
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        dateArray.push({
          dateText,
          date,
          diffDays,
          meals: data[dateText]
        });
      }
    }
    
    // Seřadíme podle vzdálenosti od dnešního dne
    // Dnešek (0) na začátek, následující dny (1, 2, 3...) po něm, předchozí dny (-1, -2...) na konec
    dateArray.sort((a, b) => {
      // Přednostně řadíme podle toho, jestli je datum dnes, v budoucnu nebo v minulosti
      if ((a.diffDays >= 0 && b.diffDays >= 0) || (a.diffDays < 0 && b.diffDays < 0)) {
        // Oba jsou ve stejné kategorii (budoucnost nebo minulost), řadíme podle vzdálenosti
        return a.diffDays - b.diffDays;
      }
      // Jeden je v budoucnosti a druhý v minulosti
      return a.diffDays < 0 ? 1 : -1; // Budoucí dny před minulými
    });
    
    // Vytvoříme nový objekt s daty ve správném pořadí
    const sortedData = {};
    dateArray.forEach(item => {
      sortedData[item.dateText] = item.meals;
    });
    
    return sortedData;
  };

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
          <p>Přihlášen jako: {localStorage.getItem('userEmail') || 'D@D'}</p>
          <button onClick={handleLogout} className="logout-button">
            Odhlásit se
          </button>
        </div>
      </div>

      {Object.entries(menuData).map(([dayTitle, meals]) => {
        return (
          <div key={dayTitle} className="day-block">
            <h2 className="day-heading">{dayTitle}</h2>
            <div className="meals-list">
              {meals.map((meal) => (
                <div key={meal.id} className="meal-card">
                  <h3>{meal.type}</h3>
                  <p className="meal-name">{meal.name}</p>
                  <div className="button-group">
                    <button
                      className="rate-button"
                      onClick={() => navigate(`/rating/${meal.id}`, { 
                        state: { meal, dayTitle } 
                      })}
                    >
                      Ohodnotit
                    </button>
                    <button
                      className="gallery-button"
                      onClick={() => {
                        console.log('Navigace do galerie pro jídlo ID:', meal.id);
                        navigate(`/gallery/${meal.id}`);
                      }}
                    >
                      Galerie
                    </button>
                  </div>
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