import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTagline, setShowTagline] = useState(false);

  const slides = [
    {
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Santorini, Greece'
    },
    {
      url: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Swiss Alps, Switzerland'
    },
    {
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Maldives Beach'
    },
    {
      url: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Bali, Indonesia'
    },
    {
      url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Paris, France'
    },
    {
      url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
      title: 'Dubai Skyline'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleStartJourney = () => {
    navigate('/login');
  };

  const handleButtonHover = (isHovering) => {
    setShowTagline(isHovering);
  };

  return (
    <div className='landing-page'>
      <div className='slideshow-container'>
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.url})` }}
          >
            <div className='slide-overlay'></div>
          </div>
        ))}
      </div>
      
      <div className='landing-content'>
        <Logo size="large" showText={true} className="logo-light" />
        <p className='ai-tagline'>Your Constant AI-Powered Travel Assistant</p>
        <div className='button-container'>
          <button 
            className='cta-button' 
            onClick={handleStartJourney}
            onMouseEnter={() => handleButtonHover(true)}
            onMouseLeave={() => handleButtonHover(false)}
          >
            Let's Start Your Journey
          </button>
          <div className={`tagline-overlay ${showTagline ? 'show' : ''}`}>
            <span className='celebration-emoji'>🎉</span>
            <span className='tagline-text'>Let's go, traveller!</span>
          </div>
        </div>
      </div>

      <div className='slide-indicators'>
        {slides.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
