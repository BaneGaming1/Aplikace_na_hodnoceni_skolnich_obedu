import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

const RatingsSummary = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    taste: { excellent: 0, acceptable: 0, unacceptable: 0 },
    appearance: { excellent: 0, sufficient: 0, unacceptable: 0 },
    temperature: { hot: 0, just_right: 0, cold: 0 },
    portionSize: { too_much: 0, just_right: 0, too_little: 0 },
    price: { would_pay_more: 0, appropriate: 0, overpriced: 0 }
  });

  const meal = location.state?.meal || {};
  const dayTitle = location.state?.dayTitle || '';

  useEffect(() => {
    // Kontrola, zda je uživatel přihlášen
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    // Načtení hodnocení pro dané jídlo
    const fetchRatings = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/ratings/${params.id}`);
        setRatings(response.data);
        
        // Výpočet statistik
        if (response.data.length > 0) {
          calculateStats(response.data);
        }
      } catch (error) {
        console.error('Chyba při načítání hodnocení:', error);
        setError('Nepodařilo se načíst hodnocení. Zkuste to prosím později.');
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [params.id, navigate]);

  // Výpočet statistik hodnocení
  const calculateStats = (ratingsList) => {
    const newStats = {
      taste: { excellent: 0, acceptable: 0, unacceptable: 0 },
      appearance: { excellent: 0, sufficient: 0, unacceptable: 0 },
      temperature: { hot: 0, just_right: 0, cold: 0 },
      portionSize: { too_much: 0, just_right: 0, too_little: 0 },
      price: { would_pay_more: 0, appropriate: 0, overpriced: 0 }
    };

    ratingsList.forEach(rating => {
      // Chuť
      if (rating.taste) newStats.taste[rating.taste]++;
      
      // Vzhled
      if (rating.appearance) newStats.appearance[rating.appearance]++;
      
      // Teplota
      if (rating.temperature) newStats.temperature[rating.temperature]++;
      
      // Velikost porce
      if (rating.portion_size) newStats.portionSize[rating.portion_size]++;
      
      // Cena
      if (rating.price) newStats.price[rating.price]++;
    });

    setStats(newStats);
  };

  // Funkce pro převod klíčů na čitelné texty
  const getReadableText = (key, category) => {
    const translations = {
      taste: {
        excellent: 'Výborný',
        acceptable: 'Přijatelné',
        unacceptable: 'Nepřijatelné'
      },
      appearance: {
        excellent: 'Výborný',
        sufficient: 'Dostačující',
        unacceptable: 'Nepřijatelné'
      },
      temperature: {
        hot: 'Horké',
        just_right: 'Akorát',
        cold: 'Studené'
      },
      portionSize: {
        too_much: 'Příliš mnoho',
        just_right: 'Akorát',
        too_little: 'Málo'
      },
      price: {
        would_pay_more: 'Připlatil bych si',
        appropriate: 'Odpovídající',
        overpriced: 'Předražené'
      }
    };

    return translations[category]?.[key] || key;
  };

  // Výpočet procent pro progress bar
  const calculatePercentage = (value, total) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Načítání hodnocení...</p>
      </div>
    );
  }

  return (
    <div className="ratings-summary-container">
      <div className="ratings-header">
        <button onClick={() => navigate('/menu')} className="btn btn-back">
          ← Zpět na jídelníček
        </button>
        <h2>Přehled hodnocení</h2>
      </div>

      <div className="meal-info">
        <h3>{dayTitle}</h3>
        <p>{meal.type}: {meal.name}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {ratings.length === 0 ? (
        <div className="no-ratings">
          <p>Pro toto jídlo zatím nejsou žádná hodnocení</p>
        </div>
      ) : (
        <div className="ratings-content">
          <div className="ratings-stats">
            <div className="stats-section">
              <h3>Chuť</h3>
              {Object.entries(stats.taste).map(([key, value]) => (
                <div key={`taste-${key}`} className="stat-item">
                  <div className="stat-label">{getReadableText(key, 'taste')}</div>
                  <div className="stat-bar-container">
                    <div 
                      className={`stat-bar stat-bar-${key}`} 
                      style={{ width: `${calculatePercentage(value, ratings.length)}%` }}
                    ></div>
                    <span className="stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-section">
              <h3>Vzhled</h3>
              {Object.entries(stats.appearance).map(([key, value]) => (
                <div key={`appearance-${key}`} className="stat-item">
                  <div className="stat-label">{getReadableText(key, 'appearance')}</div>
                  <div className="stat-bar-container">
                    <div 
                      className={`stat-bar stat-bar-${key}`} 
                      style={{ width: `${calculatePercentage(value, ratings.length)}%` }}
                    ></div>
                    <span className="stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-section">
              <h3>Teplota</h3>
              {Object.entries(stats.temperature).map(([key, value]) => (
                <div key={`temperature-${key}`} className="stat-item">
                  <div className="stat-label">{getReadableText(key, 'temperature')}</div>
                  <div className="stat-bar-container">
                    <div 
                      className={`stat-bar stat-bar-${key}`} 
                      style={{ width: `${calculatePercentage(value, ratings.length)}%` }}
                    ></div>
                    <span className="stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-section">
              <h3>Velikost porce</h3>
              {Object.entries(stats.portionSize).map(([key, value]) => (
                <div key={`portionSize-${key}`} className="stat-item">
                  <div className="stat-label">{getReadableText(key, 'portionSize')}</div>
                  <div className="stat-bar-container">
                    <div 
                      className={`stat-bar stat-bar-${key}`} 
                      style={{ width: `${calculatePercentage(value, ratings.length)}%` }}
                    ></div>
                    <span className="stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="stats-section">
              <h3>Cena</h3>
              {Object.entries(stats.price).map(([key, value]) => (
                <div key={`price-${key}`} className="stat-item">
                  <div className="stat-label">{getReadableText(key, 'price')}</div>
                  <div className="stat-bar-container">
                    <div 
                      className={`stat-bar stat-bar-${key}`} 
                      style={{ width: `${calculatePercentage(value, ratings.length)}%` }}
                    ></div>
                    <span className="stat-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ratings-comments">
            <h3>Komentáře ({ratings.filter(r => r.comment && r.comment.trim()).length})</h3>
            {ratings.filter(r => r.comment && r.comment.trim()).length === 0 ? (
              <p className="no-comments">Žádné komentáře</p>
            ) : (
              <div className="comments-list">
                {ratings
                  .filter(r => r.comment && r.comment.trim())
                  .map((rating, index) => (
                    <div key={index} className="comment-item">
                      <div className="comment-date">
                        {new Date(rating.created_at).toLocaleDateString()} 
                        {new Date(rating.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="comment-text">{rating.comment}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsSummary;