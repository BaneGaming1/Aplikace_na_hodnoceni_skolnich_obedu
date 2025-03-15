import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Gallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Získání informací o jídle z navigačního stavu
  const meal = location.state?.meal || {};
  const dayTitle = location.state?.dayTitle || '';
  
  // Získání přihlášeného uživatele z localStorage
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');

  // Načtení obrázků při načtení stránky
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/gallery/${id}`);
        setImages(response.data.images || []);
        setLoading(false);
      } catch (err) {
        console.error('Chyba při načítání galerie:', err);
        setError('Nepodařilo se načíst fotografie. Zkuste to prosím později.');
        setLoading(false);
      }
    };

    fetchImages();
  }, [id]);

  // Zpracování změny souboru
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Vytvoření náhledu souboru
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Nahrání obrázku
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('mealId', id);
      formData.append('userId', userId || '1');

      await axios.post('http://localhost:5000/api/gallery/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Po úspěšném nahrání obnovíme seznam obrázků
      const response = await axios.get(`http://localhost:5000/api/gallery/${id}`);
      setImages(response.data.images || []);
      
      // Vyčistíme formulář
      setSelectedFile(null);
      setPreview(null);
      
      // Resetujeme vstupní pole
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Chyba při nahrávání obrázku:', err);
      setError('Nepodařilo se nahrát obrázek. Zkuste to prosím později.');
    } finally {
      setUploading(false);
    }
  };

  // Smazání obrázku
  const handleDelete = async (imageId) => {
    if (!userId || deleting) return;
    
    // Oprava ESLint chyby - použijeme window.confirm místo confirm
    if (!window.confirm('Opravdu chcete smazat tento obrázek?')) return;

    setDeleting(true);
    try {
      await axios.delete(`http://localhost:5000/api/gallery/${imageId}`, {
        data: { userId }
      });
      
      // Po úspěšném smazání aktualizujeme seznam obrázků
      const response = await axios.get(`http://localhost:5000/api/gallery/${id}`);
      setImages(response.data.images || []);
    } catch (err) {
      console.error('Chyba při mazání obrázku:', err);
      setError('Nepodařilo se smazat obrázek. ' + (err.response?.data?.error || 'Zkuste to prosím později.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #eee',
        paddingBottom: '10px'
      }}>
        <button 
          onClick={() => navigate('/menu')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#0066ff', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ← Zpět na jídelníček
        </button>
        <h1 style={{ margin: 0 }}>Galerie jídla</h1>
      </div>

      {meal.name && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <h3 style={{ marginTop: 0 }}>{dayTitle}</h3>
          <p style={{ margin: 0 }}>{meal.type}: {meal.name}</p>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px' 
      }}>
        <h2 style={{ marginTop: 0 }}>Přidat fotografii</h2>
        <div>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ marginBottom: '15px', display: 'block' }}
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0066ff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              opacity: (!selectedFile || uploading) ? 0.7 : 1
            }}
          >
            {uploading ? 'Nahrávání...' : 'Nahrát fotografii'}
          </button>
        </div>

        {preview && (
          <div style={{ marginTop: '20px' }}>
            <h3>Náhled:</h3>
            <img
              src={preview}
              alt="Náhled"
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '5px' }}
            />
          </div>
        )}
      </div>

      <div>
        <h2>Fotografie</h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Načítání...</div>
        ) : images.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            color: '#666'
          }}>
            <p>Galerie je prázdná. Nahrajte první fotografii.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            {images.map(image => (
              <div key={image.id} style={{ 
                border: '1px solid #eee',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                <img
                  src={`http://localhost:5000/uploads/${image.image_path}`}
                  alt="Fotografie jídla"
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/200x150?text=Obrázek+není+dostupný';
                  }}
                />

                {/* Tlačítko smazat - zobrazí se jen u vlastních obrázků */}
                {userEmail && image.uploaded_by === userEmail && (
                  <button
                    onClick={() => handleDelete(image.id)}
                    disabled={deleting}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '25px',
                      height: '25px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      opacity: deleting ? 0.7 : 1
                    }}
                    title="Smazat obrázek"
                  >
                    ×
                  </button>
                )}

                <div style={{ padding: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                  {image.uploaded_by && (
                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                      {image.uploaded_by}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;