import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Gallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meal, setMeal] = useState(null);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  // Při načtení komponenty
  useEffect(() => {
    // Kontrola přihlášení
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        console.log('Načítám galerii pro jídlo ID:', id);
        
        // Načtení informací o jídle
        try {
          const mealResponse = await axios.get(`/api/meals/${id}`);
          setMeal(mealResponse.data);
        } catch (err) {
          // Pokud jídlo není v DB, nastavíme základní údaje
          setMeal({
            id: id,
            name: 'Jídlo z jídelníčku',
            date: new Date().toISOString().split('T')[0]
          });
        }
        
        // Načtení fotografií konkrétního jídla
        const imagesResponse = await axios.get(`/api/meals/${id}/images`);
        setImages(imagesResponse.data);
        console.log('Načteno fotografií:', imagesResponse.data.length);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Chyba při načítání dat:', err);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Vybírání souboru
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Odeslání formuláře
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      alert('Nejprve vyberte soubor');
      return;
    }
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('mealId', id);
    formData.append('userId', localStorage.getItem('userId'));
    
    try {
      await axios.post('/api/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Po úspěšném nahrání obnovíme seznam
      const response = await axios.get(`/api/meals/${id}/images`);
      setImages(response.data);
      
      // Reset formuláře
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';
    } catch (err) {
      console.error('Chyba při nahrávání:', err);
      alert('Nepodařilo se nahrát fotografii');
    }
  };

  // Mazání fotografie
  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Opravdu chcete smazat tuto fotografii?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/images/${imageId}`);
      
      // Aktualizace seznamu fotografií
      const response = await axios.get(`/api/meals/${id}/images`);
      setImages(response.data);
    } catch (err) {
      console.error('Chyba při mazání fotografie:', err);
      alert('Nepodařilo se smazat fotografii');
    }
  };

  // Formátování data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('cs-CZ');
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return <div>Načítání...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link to="/menu" style={{ color: '#0066FF', textDecoration: 'none' }}>
          ← Zpět na jídelníček
        </Link>
        <h1>Galerie jídla</h1>
      </div>

      {meal && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>{formatDate(meal.date)}</h2>
          <p>{meal.name}</p>
          <p style={{ fontSize: '12px', color: '#666' }}>ID jídla: {id}</p>
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Přidat fotografii</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            id="fileInput"
            accept="image/*"
            onChange={handleFileChange}
            style={{ marginBottom: '10px' }}
          />
          <button 
            type="submit" 
            disabled={!selectedFile}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: '#0066FF', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            Nahrát fotografii
          </button>
        </form>
      </div>

      <h3>Fotografie</h3>
      
      {images.length === 0 ? (
        <p>Galerie je prázdná. Nahrajte první fotografii.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {images.map((image) => (
            <div key={image.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <img 
                src={`/uploads/${image.image_path}`} 
                alt="Fotografie jídla" 
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
              <div style={{ padding: '10px' }}>
                <p>{formatDate(image.created_at)}</p>
                <p>{image.email}</p>
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  Smazat fotografii
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;