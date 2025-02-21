import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';


const Rating = () => {
  const params = useParams();
  const navigate = useNavigate();

  console.log('Params:', params);

  const [rating, setRating] = useState({
    chut: '',
    vzhled: '',
    teplota: '',
    velikostPorce: '',
    cena: '',
    komentar: ''
  });
  

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`Hodnocení pro jídlo ${params.id}:`, rating);
    navigate('/menu');
  };

  return (
    <div className="rating-container">
      <div className="rating-header">
        <button onClick={() => navigate('/menu')} className="back-button">
          ← Zpět
        </button>
        <h2>Hodnocení obědu</h2>
      </div>

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
            placeholder="Napište svůj komentář..."
          />
        </div>

        <button type="submit" className="submit-button">
          Odeslat hodnocení
        </button>
      </form>
    </div>
  );
};

export default Rating;