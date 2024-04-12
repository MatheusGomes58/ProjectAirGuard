import React, { useState } from 'react';
import './slide.css';

const Slideshow = ({ images }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const handlePrevSlide = () => {
        setCurrentSlide(currentSlide === 0 ? images.length - 1 : currentSlide - 1);
    };

    const handleNextSlide = () => {
        setCurrentSlide(currentSlide === images.length - 1 ? 0 : currentSlide + 1);
    };

    return (
        <div className="slideshow-container">
            <div className="slideshow">
                <button className="prev" onClick={handlePrevSlide}>&#10094;</button>
                <div className="slide-container">
                    {images && images.map((image, index) => (
                        <img className='img' key={index} src={image} alt={`Slide ${index}`} style={{ display: index === currentSlide ? 'block' : 'none' }} />
                    ))}
                </div>
                <button className="next" onClick={handleNextSlide}>&#10095;</button>
            </div>
        </div>
    );
};

export default Slideshow;
