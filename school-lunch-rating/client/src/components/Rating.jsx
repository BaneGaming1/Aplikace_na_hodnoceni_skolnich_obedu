import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Rating() {
  const [rating, setRating] = useState({
    chut: '',
    teplota: '',
    porce: ''
  });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Hodnocení:', rating);
    navigate('/menu');
  };

  return (
    <div className="rating-container">
      <h2>Hodnocení obědu</h2>
      <form onSubmit={handleSubmit}>
        <div className="rating-group">
          <label>Chuť jídla:</label>
          <select 
            value={rating.chut}
            onChange={(e) => setRating({...rating, chut: e.target.value})}
            required
          >
            <option value="">Vyberte hodnocení</option>
            <option value="vyborne">Výborné</option>
            <option value="prumerne">Průměrné</option>
            <option value="nevyhovujici">Nevyhovující</option>
          </select>
        </div>

        <div className="rating-group">
          <label>Teplota:</label>
          <select 
            value={rating.teplota}
            onChange={(e) => setRating({...rating, teplota: e.target.value})}
            required
          >
            <option value="">Vyberte teplotu</option>
            <option value="studene">Studené</option>
            <option value="akorat">Akorát</option>
            <option value="horke">Horké</option>
          </select>
        </div>

        <div className="rating-group">
          <label>Porce:</label>
          <select 
            value={rating.porce}
            onChange={(e) => setRating({...rating, porce: e.target.value})}
            required
          >
            <option value="">Vyberte velikost porce</option>
            <option value="malo">Měl jsem hlad</option>
            <option value="akorat">Akorát</option>
            <option value="moc">Přejedl jsem se</option>
          </select>
        </div>

        <button type="submit">Odeslat hodnocení</button>
      </form>
    </div>
  );
}

export default Rating;