import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import ImageGallery from './Gallery'; // Import nové komponenty pro galerii

const Rating = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showGallery, setShowGallery] = useState(false); // Stav pro zobrazení/skrytí galerie

  const meal = location.state?.meal || {};
  const dayTitle = location.state?.dayTitle || '';

  const [rating, setRating] = useState({
    chut: '',
    vzhled: '',
    teplota: '',
    velikostPorce: '',
    cena: '',
    komentar: ''
  });

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
          `http://localhost:5000/api/ratings/check/${params.id}/${userId}`
        );
        
        if (response.data.hasRated) {
          setAlreadyRated(true);
        }
      } catch (error) {
        console.error('Chyba při kontrole hodnocení:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRating();
  }, [params.id, navigate]);

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
        taste: rating.chut,
        appearance: rating.vzhled,
        temperature: rating.teplota,
        portionSize: rating.velikostPorce,
        price: rating.cena,
        comment: rating.komentar
      };

      await axios.post('http://localhost:5000/api/ratings', ratingData);
      
      setSuccess(true);
      
      // Po úspěšném hodnocení zobrazíme galerii
      setShowGallery(true);
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
        <button onClick={() => navigate('/menu')} className="back-button">
          ← Zpět
        </button>
        <h2>Hodnocení obědu</h2>
      </div>

      <div className="meal-info">
        <h3>{dayTitle}</h3>
        <p>{meal.type}: {meal.name}</p>
      </div>

      {alreadyRated ? (
        <div className="already-rated-message">
          <p>Toto jídlo jste již hodnotili.</p>
          <button 
            onClick={() => setShowGallery(!showGallery)} 
            className="toggle-gallery-button"
          >
            {showGallery ? 'Skrýt galerii' : 'Zobrazit galerii obrázků'}
          </button>
          
          {/* Zobrazíme galerii, pokud je uživatel již hodnotil a chce ji vidět */}
          {showGallery && <ImageGallery mealId={params.id} />}
        </div>
      ) : success ? (
        <div className="success-message">
          <p>Hodnocení bylo úspěšně odesláno!</p>
          <p>Děkujeme za váš názor.</p>
          
          <button 
            onClick={() => setShowGallery(!showGallery)} 
            className="toggle-gallery-button"
          >
            {showGallery ? 'Skrýt galerii' : 'Podívat se na galerii obrázků nebo přidat vlastní'}
          </button>
          
          {/* Zobrazíme galerii po úspěšném hodnocení, pokud ji uživatel chce vidět */}
          {showGallery && <ImageGallery mealId={params.id} />}
          
          <button 
            onClick={() => navigate('/menu')} 
            className="back-to-menu-button"
            style={{ marginTop: '20px' }}
          >
            Zpět na jídelníček
          </button>
        </div>
      ) : (
        <>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="rating-group">
              <div className="rating-item">
                <label className="label">Chuť</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.chut === 'vyborny' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="chut"
                      value="vyborny"
                      onChange={(e) => setRating({...rating, chut: e.target.value})}
                      required
                      hidden
                    />
                    Výborný
                  </label>
                  <label className={`rating-option ${rating.chut === 'prijatelne' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="chut"
                      value="prijatelne"
                      onChange={(e) => setRating({...rating, chut: e.target.value})}
                      hidden
                    />
                    Přijatelné
                  </label>
                  <label className={`rating-option ${rating.chut === 'neprijatelne' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="chut"
                      value="neprijatelne"
                      onChange={(e) => setRating({...rating, chut: e.target.value})}
                      hidden
                    />
                    Nepřijatelné
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Vzhled</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.vzhled === 'vyborny' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="vzhled"
                      value="vyborny"
                      onChange={(e) => setRating({...rating, vzhled: e.target.value})}
                      required
                      hidden
                    />
                    Výborný
                  </label>
                  <label className={`rating-option ${rating.vzhled === 'dostacujici' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="vzhled"
                      value="dostacujici"
                      onChange={(e) => setRating({...rating, vzhled: e.target.value})}
                      hidden
                    />
                    Dostačující
                  </label>
                  <label className={`rating-option ${rating.vzhled === 'neprijatelne' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="vzhled"
                      value="neprijatelne"
                      onChange={(e) => setRating({...rating, vzhled: e.target.value})}
                      hidden
                    />
                    Nepřijatelné
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Teplota</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.teplota === 'horke' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="teplota"
                      value="horke"
                      onChange={(e) => setRating({...rating, teplota: e.target.value})}
                      required
                      hidden
                    />
                    Horké
                  </label>
                  <label className={`rating-option ${rating.teplota === 'akorat' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="teplota"
                      value="akorat"
                      onChange={(e) => setRating({...rating, teplota: e.target.value})}
                      hidden
                    />
                    Akorát
                  </label>
                  <label className={`rating-option ${rating.teplota === 'studene' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="teplota"
                      value="studene"
                      onChange={(e) => setRating({...rating, teplota: e.target.value})}
                      hidden
                    />
                    Studené
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Velikost porce</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.velikostPorce === 'prilis' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="velikostPorce"
                      value="prilis"
                      onChange={(e) => setRating({...rating, velikostPorce: e.target.value})}
                      required
                      hidden
                    />
                    Příliš mnoho
                  </label>
                  <label className={`rating-option ${rating.velikostPorce === 'akorat' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="velikostPorce"
                      value="akorat"
                      onChange={(e) => setRating({...rating, velikostPorce: e.target.value})}
                      hidden
                    />
                    Akorát
                  </label>
                  <label className={`rating-option ${rating.velikostPorce === 'malo' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="velikostPorce"
                      value="malo"
                      onChange={(e) => setRating({...rating, velikostPorce: e.target.value})}
                      hidden
                    />
                    Málo
                  </label>
                </div>
              </div>

              <div className="rating-item">
                <label className="label">Cena</label>
                <div className="rating-options">
                  <label className={`rating-option ${rating.cena === 'priplatil' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cena"
                      value="priplatil"
                      onChange={(e) => setRating({...rating, cena: e.target.value})}
                      required
                      hidden
                    />
                    Připlatil bych si
                  </label>
                  <label className={`rating-option ${rating.cena === 'odpovidajici' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cena"
                      value="odpovidajici"
                      onChange={(e) => setRating({...rating, cena: e.target.value})}
                      hidden
                    />
                    Odpovídající
                  </label>
                  <label className={`rating-option ${rating.cena === 'predrazene' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="cena"
                      value="predrazene"
                      onChange={(e) => setRating({...rating, cena: e.target.value})}
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
                value={rating.komentar}
                onChange={(e) => setRating({...rating, komentar: e.target.value})}
                placeholder="Napište svůj komentář (nepovinné)..."
              />
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? 'Odesílání...' : 'Odeslat hodnocení'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default Rating;