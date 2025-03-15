import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../Gallery.css'; // Vytvoříme CSS soubor (popsán níže)

const Gallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(null);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Kontrola, zda je uživatel přihlášen
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchMealAndImages = async () => {
      try {
        // Pokusíme se načíst detail jídla
        try {
          const mealResponse = await axios.get(`http://localhost:5000/api/meals/${id}`);
          setMeal(mealResponse.data);
        } catch (err) {
          console.log('Jídlo nebylo nalezeno v databázi, používáme ID z URL');
          // Pokud jídlo není v databázi, použijeme ID a nastavíme základní informace
          setMeal({
            id: id,
            name: 'Jídlo z jídelníčku',
            date: new Date().toISOString().split('T')[0]
          });
        }
        
        // Načteme fotografie pro konkrétní jídlo
        const imagesResponse = await axios.get(`http://localhost:5000/api/meals/${id}/images`);
        console.log('Načtené fotografie:', imagesResponse.data);
        setImages(imagesResponse.data);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Chyba při načítání dat:', err);
        setError('Nepodařilo se načíst data. Zkuste to prosím později.');
        setIsLoading(false);
      }
    };

    fetchMealAndImages();
  }, [id, navigate]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Nejprve vyberte soubor');
      return;
    }
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('mealId', id); // Důležité - správné ID jídla
    formData.append('userId', localStorage.getItem('userId'));
    
    try {
      const response = await axios.post('http://localhost:5000/api/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Odpověď serveru:', response.data);
      
      // Po úspěšném nahrání obnovíme seznam obrázků
      const newImagesResponse = await axios.get(`http://localhost:5000/api/meals/${id}/images`);
      setImages(newImagesResponse.data);
      
      setUploading(false);
      setSelectedFile(null);
      
      // Reset inputu souboru
      document.getElementById('fileInput').value = '';
    } catch (err) {
      console.error('Chyba při nahrávání fotografie:', err);
      alert('Nepodařilo se nahrát fotografii. Zkuste to prosím znovu.');
      setUploading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Načítání...</p>
      </div>
    );
  }
  
  if (error) {
    return (
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
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <Link to="/menu" className="back-link">← Zpět na jídelníček</Link>
        <h1>Galerie jídla</h1>
      </div>

      {meal && (
        <div className="meal-info">
          <h2>{formatDate(meal.date)}</h2>
          <p>{meal.name}</p>
        </div>
      )}

      <div className="upload-section">
        <h3>Přidat fotografii</h3>
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
          
          <button 
            type="submit" 
            className="upload-button"
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Nahrávání...' : 'Nahrát fotografii'}
          </button>
        </form>
      </div>

      <h3>Fotografie</h3>
      
      {images.length === 0 ? (
        <p className="no-images">Galerie je prázdná. Nahrajte první fotografii.</p>
      ) : (
        <div className="images-grid">
          {images.map((image) => (
            <div key={image.id} className="image-card">
              <img src={`http://localhost:5000/uploads/${image.image_path}`} alt={meal?.name || 'Jídlo'} />
              <div className="image-info">
                <p className="image-date">{formatDate(image.created_at)}</p>
                <p className="image-author">{image.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;