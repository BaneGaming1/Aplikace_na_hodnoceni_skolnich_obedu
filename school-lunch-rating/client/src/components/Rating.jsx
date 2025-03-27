import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

const Rating = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [allRatings, setAllRatings] = useState([]);

  const meal = location.state?.meal || {};
  const dayTitle = location.state?.dayTitle || '';

  const [rating, setRating] = useState({
    taste: '',
    appearance: '',
    temperature: '',
    portionSize: '',
    price: '',
    comment: ''
  });

  // Použití useCallback pro fetchAllRatings, aby se netvořila nová instance 
  // této funkce při každém renderu komponenty
  const fetchAllRatings = useCallback(async () => {
    try {
      console.log("Načítám hodnocení pro jídlo ID:", params.id);
      const response = await axios.get(`/api/ratings/${params.id}`);
      console.log("Načtená data:", response.data);
      setAllRatings(response.data);
    } catch (error) {
      console.error('Chyba při načítání hodnocení:', error);
    }
  }, [params.id]);

  useEffect(() => {
    // Kontrola, zda uživatel již hodnotil toto jídlo
    const checkRating = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          // Pokud uživatel není přihlášen, přesměrujeme na přihlášení
          navigate('/login');
          return;
        }

        const response = await axios.get(
          `/api/ratings/check/${params.id}/${userId}`
        );
        
        if (response.data.hasRated) {
          setAlreadyRated(true);
          // Získáme všechna hodnocení, když zjistíme, že uživatel již hodnotil
          fetchAllRatings();
        }
      } catch (error) {
        console.error('Chyba při kontrole hodnocení:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRating();
  }, [params.id, navigate, fetchAllRatings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }

      console.log('Odesílám hodnocení pro jídlo ID:', params.id);
      
      const ratingData = {
        mealId: params.id,
        userId,
        taste: rating.taste,
        appearance: rating.appearance,
        temperature: rating.temperature,
        portionSize: rating.portionSize,
        price: rating.price,
        comment: rating.comment
      };

      try {
        await axios.post('/api/ratings', ratingData);
        console.log("Hodnocení úspěšně odesláno");
      } catch (error) {
        console.error("Detail chyby:", error.response?.data);
        throw error; // Propagace chyby pro další zpracování
      }
      
      setSuccess(true);
      
      // Po odeslání hodnocení získejme všechna hodnocení
      fetchAllRatings();
      
      // Nastavíme, že uživatel již hodnotil
      setAlreadyRated(true);
      
      // Po 2 sekundách skryjeme úspěšnou zprávu
      setTimeout(() => {
        setSuccess(false);
        setShowRatings(true);
      }, 2000);
    } catch (error) {
      console.error('Chyba při odesílání hodnocení:', error);
      let errorMessage = 'Nepodařilo se odeslat hodnocení. Zkuste to prosím později.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Funkce pro převod klíčů hodnocení na čitelný text
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Načítání...</p>
      </div>
    );
  }

  return (
    <div className="rating-container">
      <div className="rating-header">
        <button onClick={() => navigate('/menu')} className="btn btn-back">
          ← Zpět
        </button>
        <h2>Hodnocení obědu</h2>
      </div>

      <div className="meal-info">
        <h3>{dayTitle}</h3>
        <p>{meal.type}: {meal.name}</p>
      </div>

      {alreadyRated || showRatings ? (
        <div className="ratings-section">
          {success && <div className="success-message">Hodnocení bylo úspěšně odesláno!</div>}

          {alreadyRated && !showRatings && (
            <div className="already-rated-message">
              <p>Toto jídlo jste již hodnotili.</p>
              <button 
                onClick={() => {
                  fetchAllRatings();
                  setShowRatings(true);
                }} 
                className="btn btn-primary show-ratings-btn"
              >
                Zobrazit všechna hodnocení
              </button>
            </div>
          )}

          {showRatings && (
            <div className="all-ratings">
              <h3>Přehled hodnocení</h3>
              
              {allRatings.length === 0 ? (
                <p className="no-ratings">Pro toto jídlo zatím nejsou žádná hodnocení.</p>
              ) : (
                <>
                  <div className="rating-statistics">
                    <div className="rating-category">
                      <h4>Chuť</h4>
                      <div className="stat-bars">
                        {Object.entries(
                          allRatings.reduce((acc, rating) => {
                            if (rating.taste) {
                              acc[rating.taste] = (acc[rating.taste] || 0) + 1;
                            }
                            return acc;
                          }, {})
                        ).map(([taste, count]) => (
                          <div key={`taste-${taste}`} className="stat-item">
                            <div className="stat-label">{getReadableText(taste, 'taste')}</div>
                            <div className="stat-bar-container">
                              <div 
                                className={`stat-bar stat-bar-${taste}`} 
                                style={{ 
                                  width: `${Math.round((count / allRatings.length) * 100)}%` 
                                }}
                              ></div>
                              <span className="stat-value">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rating-category">
                      <h4>Cena</h4>
                      <div className="stat-bars">
                        {Object.entries(
                          allRatings.reduce((acc, rating) => {
                            if (rating.price) {
                              acc[rating.price] = (acc[rating.price] || 0) + 1;
                            }
                            return acc;
                          }, {})
                        ).map(([price, count]) => (
                          <div key={`price-${price}`} className="stat-item">
                            <div className="stat-label">{getReadableText(price, 'price')}</div>
                            <div className="stat-bar-container">
                              <div 
                                className={`stat-bar stat-bar-${price}`} 
                                style={{ 
                                  width: `${Math.round((count / allRatings.length) * 100)}%` 
                                }}
                              ></div>
                              <span className="stat-value">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="rating-comments">
                    <h4>Komentáře</h4>
                    <div className="comments-list">
                      {allRatings.filter(r => r.comment).length === 0 ? (
                        <p className="no-comments">Žádné komentáře</p>
                      ) : (
                        allRatings
                          .filter(r => r.comment)
                          .map((rating, index) => (
                            <div key={index} className="comment-item">
                              <div className="comment-date">
                                {new Date(rating.created_at).toLocaleDateString()}
                              </div>
                              <div className="comment-text">{rating.comment}</div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                  
                  <div className="rating-actions">
                    <button 
                      onClick={() => navigate('/menu')} 
                      className="btn btn-primary"
                    >
                      Zpět na jídelníček
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rating-form-section">
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="rating-group">
              <div className="rating-item">
                <label className="label">Chuť</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.taste === 'excellent' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="taste"
                      value="excellent"
                      onChange={(e) => setRating({...rating, taste: e.target.value})}
                      required
                      hidden
                    />
                    Výborný
                  </label>
                  <label className={`rating-option ${rating.taste === 'acceptable' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="taste"
                      value="acceptable"
                      onChange={(e) => setRating({...rating, taste: e.target.value})}
                      hidden
                    />
                    Přijatelné
                  </label>
                  <label className={`rating-option ${rating.taste === 'unacceptable' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="taste"
                      value="unacceptable"
                      onChange={(e) => setRating({...rating, taste: e.target.value})}
                      hidden
                    />
                    Nepřijatelné
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Vzhled</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.appearance === 'excellent' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="appearance"
                      value="excellent"
                      onChange={(e) => setRating({...rating, appearance: e.target.value})}
                      required
                      hidden
                    />
                    Výborný
                  </label>
                  <label className={`rating-option ${rating.appearance === 'sufficient' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="appearance"
                      value="sufficient"
                      onChange={(e) => setRating({...rating, appearance: e.target.value})}
                      hidden
                    />
                    Dostačující
                  </label>
                  <label className={`rating-option ${rating.appearance === 'unacceptable' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="appearance"
                      value="unacceptable"
                      onChange={(e) => setRating({...rating, appearance: e.target.value})}
                      hidden
                    />
                    Nepřijatelné
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Teplota</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.temperature === 'hot' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="temperature"
                      value="hot"
                      onChange={(e) => setRating({...rating, temperature: e.target.value})}
                      required
                      hidden
                    />
                    Horké
                  </label>
                  <label className={`rating-option ${rating.temperature === 'just_right' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="temperature"
                      value="just_right"
                      onChange={(e) => setRating({...rating, temperature: e.target.value})}
                      hidden
                    />
                    Akorát
                  </label>
                  <label className={`rating-option ${rating.temperature === 'cold' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="temperature"
                      value="cold"
                      onChange={(e) => setRating({...rating, temperature: e.target.value})}
                      hidden
                    />
                    Studené
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Velikost porce</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.portionSize === 'too_much' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="portionSize"
                      value="too_much"
                      onChange={(e) => setRating({...rating, portionSize: e.target.value})}
                      required
                      hidden
                    />
                    Příliš mnoho
                  </label>
                  <label className={`rating-option ${rating.portionSize === 'just_right' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="portionSize"
                      value="just_right"
                      onChange={(e) => setRating({...rating, portionSize: e.target.value})}
                      hidden
                    />
                    Akorát
                  </label>
                  <label className={`rating-option ${rating.portionSize === 'too_little' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="portionSize"
                      value="too_little"
                      onChange={(e) => setRating({...rating, portionSize: e.target.value})}
                      hidden
                    />
                    Málo
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Cena</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.price === 'would_pay_more' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="price"
                      value="would_pay_more"
                      onChange={(e) => setRating({...rating, price: e.target.value})}
                      required
                      hidden
                    />
                    Připlatil bych si
                  </label>
                  <label className={`rating-option ${rating.price === 'appropriate' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="price"
                      value="appropriate"
                      onChange={(e) => setRating({...rating, price: e.target.value})}
                      hidden
                    />
                    Odpovídající
                  </label>
                  <label className={`rating-option ${rating.price === 'overpriced' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="price"
                      value="overpriced"
                      onChange={(e) => setRating({...rating, price: e.target.value})}
                      hidden
                    />
                    Předražené
                  </label>
                </div>
              </div>
            </div>

            <div className="comment-section">
              <label className="label">Vlastní komentář</label>
              <textarea
                value={rating.comment}
                onChange={(e) => setRating({...rating, comment: e.target.value})}
                placeholder="Napište svůj komentář (nepovinné)..."
                className="comment-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-submit"
              disabled={submitting}
            >
              {submitting ? 'Odesílání...' : 'Odeslat hodnocení'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Rating;