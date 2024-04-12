import React, { useState, useEffect } from 'react';
import { storage, realTimeDB } from '../components/firebase/firebase';
import '../css/slideshow.css'

const Slideshow = () => {
  const [images, setImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePreviousSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide === 0 ? 0 : prevSlide - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prevSlide) => (prevSlide === images.length - 1 ? images.length - 1 : prevSlide + 1));
  };

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imagesRef = storage.ref('slides');
        const imagesList = await imagesRef.listAll();
        const urls = await Promise.all(
          imagesList.items.map(async (item) => {
            return await item.getDownloadURL();
          })
        );
        setImages(urls);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    const slidesRef = realTimeDB.ref('slides');
    const handleSlideChange = (snapshot) => {
      const slides = snapshot.val();
      const currentIndex = findIndex(slides, slide => slide.order === currentSlide);
      if (currentIndex !== -1) {
        setCurrentSlide(currentIndex);
      }
    };
  
    slidesRef.on('value', handleSlideChange);
  
    return () => {
      slidesRef.off('value', handleSlideChange);
    };
  }, [currentSlide]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.keyCode === 37) { // seta para esquerda
        handlePreviousSlide();
      } else if (event.keyCode === 39) { // seta para direita
        handleNextSlide();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePreviousSlide, handleNextSlide]);

  const findIndex = (array, condition) => {
    if (!array) {
      return -1; // Retorna -1 se o array for null ou undefined
    }
    
    for (let i = 0; i < array.length; i++) {
      if (condition(array[i])) {
        return i;
      }
    }
    return -1;
  };

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
