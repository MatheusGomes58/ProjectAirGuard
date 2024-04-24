import React, { useState, useEffect } from 'react';
import { realTimeDB } from '../components/firebase/firebase'; // Mantenha o import do Realtime Database se necessário
import '../css/slideshow.css';

const Slideshow = () => {
  const [images, setImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Definir os slides automaticamente
  useEffect(() => {
    const importAll = (r) => r.keys().map(r);
    const slideImages = importAll(require.context('../img/slides', false, /\.(png|jpe?g|svg)$/));
    setImages(slideImages);

    // Adicionando listener ao Realtime Database para atualizações de slide
    const slideRef = realTimeDB.ref('slide');
    slideRef.on('value', (snapshot) => {
      const slideIndex = snapshot.val();
      if (slideIndex !== null) {
        setCurrentSlide(slideIndex);
      }
    });

    return () => {
      slideRef.off('value');
    };
  }, []);

  // Atualizar o slide no Realtime Database quando houver mudança
  useEffect(() => {
    realTimeDB.ref('slide').set(currentSlide);
  }, [currentSlide]);

  const handlePreviousSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide === 0 ? 0 : prevSlide - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide === images.length - 1 ? images.length - 1 : prevSlide + 1));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          handlePreviousSlide();
          break;
        case 'ArrowRight':
          handleNextSlide();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePreviousSlide, handleNextSlide]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="slideshow">
      <button className="floating-button left" onClick={handlePreviousSlide}><i className="fas fa-arrow-left"></i></button>
      <img src={images[currentSlide]} alt={`Slide ${currentSlide + 1}`} />
      <button className="floating-button right" onClick={handleNextSlide}><i className="fas fa-arrow-right"></i></button>
      <button className="floating-button expand" onClick={toggleFullScreen}><i className="fas fa-expand"></i></button>
    </div>
  );
};

export default Slideshow;
