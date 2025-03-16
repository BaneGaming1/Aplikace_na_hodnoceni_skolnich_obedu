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
        console.log("Načítám hodnocení pro ID:", params.id);
        const response = await axios.get(`http://localhost:5000/api/ratings/${params.id}`);
        console.log("Načtená data:", response.data);
        setRatings(response.data);
      } catch (error) {
        console.error('Chyba při načítání hodnocení:', error);
        setError('Nepodařilo se načíst hodnocení. Zkuste to prosím později.');
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [params.id, navigate]);

  // Funkce pro získání iniciálů z emailu
  const getInitials = (email) => {
    if (!email) return 'U';
    
    // Zachytí jméno a příjmení z emailu ve formátu jmeno.prijmeni@domena.cz
    const nameParts = email.split('@')[0].split('.');
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  // Formátování emailu pro zobrazení
  const formatEmail = (email) => {
    if (!email) return 'Uživatel';
    
    // Pokud má email formát jmeno.prijmeni@domena.cz, zobrazíme Jméno P.
    const nameParts = email.split('@')[0].split('.');
    if (nameParts.length >= 2) {
      return nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) + 
             ' ' + nameParts[1].charAt(0).toUpperCase() + '.';
    }
    return email.split('@')[0];
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
      portion_size: {
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

  // Funkce pro zobrazení počtu hodnocení pro danou kategorii a hodnotu
  const countRatings = (category, value) => {
    return ratings.filter(rating => rating[category] === value).length;
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
          <div className="total-ratings">
            <p className="total-ratings-count">Celkový počet hodnocení: <strong>{ratings.length}</strong></p>
          </div>

          <div className="ratings-stats">
            <div className="stats-section">
              <h3>Chuť</h3>
              <div className="stat-item">
                <div className="stat-label">Výborný</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-excellent" 
                    style={{ width: `${(countRatings('taste', 'excellent') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('taste', 'excellent')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Přijatelné</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-acceptable" 
                    style={{ width: `${(countRatings('taste', 'acceptable') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('taste', 'acceptable')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Nepřijatelné</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-unacceptable" 
                    style={{ width: `${(countRatings('taste', 'unacceptable') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('taste', 'unacceptable')}</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Vzhled</h3>
              <div className="stat-item">
                <div className="stat-label">Výborný</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-excellent" 
                    style={{ width: `${(countRatings('appearance', 'excellent') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('appearance', 'excellent')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Dostačující</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-sufficient" 
                    style={{ width: `${(countRatings('appearance', 'sufficient') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('appearance', 'sufficient')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Nepřijatelné</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-unacceptable" 
                    style={{ width: `${(countRatings('appearance', 'unacceptable') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('appearance', 'unacceptable')}</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Teplota</h3>
              <div className="stat-item">
                <div className="stat-label">Horké</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-hot" 
                    style={{ width: `${(countRatings('temperature', 'hot') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('temperature', 'hot')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Akorát</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-just_right" 
                    style={{ width: `${(countRatings('temperature', 'just_right') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('temperature', 'just_right')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Studené</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-cold" 
                    style={{ width: `${(countRatings('temperature', 'cold') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('temperature', 'cold')}</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Velikost porce</h3>
              <div className="stat-item">
                <div className="stat-label">Příliš mnoho</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-too_much" 
                    style={{ width: `${(countRatings('portion_size', 'too_much') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('portion_size', 'too_much')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Akorát</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-just_right" 
                    style={{ width: `${(countRatings('portion_size', 'just_right') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('portion_size', 'just_right')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Málo</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-too_little" 
                    style={{ width: `${(countRatings('portion_size', 'too_little') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('portion_size', 'too_little')}</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Cena</h3>
              <div className="stat-item">
                <div className="stat-label">Připlatil bych si</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-would_pay_more" 
                    style={{ width: `${(countRatings('price', 'would_pay_more') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('price', 'would_pay_more')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Odpovídající</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-appropriate" 
                    style={{ width: `${(countRatings('price', 'appropriate') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('price', 'appropriate')}</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Předražené</div>
                <div className="stat-bar-container">
                  <div 
                    className="stat-bar stat-bar-overpriced" 
                    style={{ width: `${(countRatings('price', 'overpriced') / ratings.length) * 100}%` }}
                  ></div>
                  <span className="stat-value">{countRatings('price', 'overpriced')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="individual-ratings">
            <h3>Jednotlivá hodnocení</h3>
            <div className="ratings-list">
              {ratings.map((rating, index) => (
                <div key={index} className="rating-item">
                  <div className="rating-header">
                    <div className="user-avatar">
                      {rating.email ? getInitials(rating.email) : 'U'}
                    </div>
                    <div className="rating-info">
                      <div className="rating-user">{formatEmail(rating.email)}</div>
                      <div className="rating-date">{new Date(rating.created_at).toLocaleDateString()} {new Date(rating.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="rating-details">
                    <div className="rating-detail">
                      <span className="rating-label">Chuť:</span>
                      <span className="rating-value">{getReadableText(rating.taste, 'taste')}</span>
                    </div>
                    <div className="rating-detail">
                      <span className="rating-label">Vzhled:</span>
                      <span className="rating-value">{getReadableText(rating.appearance, 'appearance')}</span>
                    </div>
                    <div className="rating-detail">
                      <span className="rating-label">Teplota:</span>
                      <span className="rating-value">{getReadableText(rating.temperature, 'temperature')}</span>
                    </div>
                    <div className="rating-detail">
                      <span className="rating-label">Velikost porce:</span>
                      <span className="rating-value">{getReadableText(rating.portion_size, 'portion_size')}</span>
                    </div>
                    <div className="rating-detail">
                      <span className="rating-label">Cena:</span>
                      <span className="rating-value">{getReadableText(rating.price, 'price')}</span>
                    </div>
                    {rating.comment && (
                      <div className="rating-comment">
                        <div className="comment-label">Komentář:</div>
                        <div className="comment-text">{rating.comment}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rating-actions">
            <button 
              onClick={() => navigate('/menu')} 
              className="btn btn-primary back-to-menu-btn"
            >
              Zpět na jídelníček
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingsSummary;