import React, { useState, useEffect } from 'react';
import { realTimeDB } from '../components/firebase/firebase.jsx';
import '../css/slideshow.css';

const Slideshow = () => {
  const [images, setImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Vite: usar import.meta.glob no lugar de require.context (webpack-only)
  useEffect(() => {
    const modules = import.meta.glob('../img/slides/*.(png|jpg|jpeg|svg)', { eager: true });
    const slideImages = Object.values(modules).map((mod) => mod.default);
    setImages(slideImages);

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

  useEffect(() => {
    if (images.length > 0) {
      realTimeDB.ref('slide').set(currentSlide);
    }
  }, [currentSlide, images.length]);

  const handlePreviousSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? 0 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === images.length - 1 ? images.length - 1 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') handlePreviousSlide();
      if (event.key === 'ArrowRight') handleNextSlide();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="slideshow">
      <button className="floating-button left" onClick={handlePreviousSlide}>
        <i className="fas fa-arrow-left"></i>
      </button>
      {images.length > 0 ? (
        <img src={images[currentSlide]} alt={`Slide ${currentSlide + 1}`} />
      ) : (
        <div className="slideshow-empty">Nenhuma imagem encontrada</div>
      )}
      <button className="floating-button right" onClick={handleNextSlide}>
        <i className="fas fa-arrow-right"></i>
      </button>
      <button className="floating-button expand" onClick={toggleFullScreen}>
        <i className="fas fa-expand"></i>
      </button>
    </div>
  );
};

export default Slideshow;
