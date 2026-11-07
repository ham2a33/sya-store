'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide } from '../lib/types';

const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD = 50;

type HeroSliderProps = {
  slides: HeroSlide[];
};

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const activeSlides = slides.filter((slide) => slide.active);

  const goTo = useCallback(
    (index: number) => {
      if (!activeSlides.length) return;
      setCurrent(((index % activeSlides.length) + activeSlides.length) % activeSlides.length);
    },
    [activeSlides.length],
  );

  const next = useCallback(() => {
    if (!activeSlides.length) return;
    setCurrent((value) => (value + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prev = useCallback(() => {
    if (!activeSlides.length) return;
    setCurrent((value) => (value - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    if (isPaused || !activeSlides.length) return;
    const timer = setInterval(() => {
      setCurrent((value) => (value + 1) % activeSlides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [isPaused, activeSlides.length]);

  if (!activeSlides.length) return null;

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    touchDeltaX.current = 0;
    setIsPaused(true);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD) {
      if (touchDeltaX.current < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setIsPaused(false);
  };

  return (
    <section
      className="hero-wrapper"
      aria-label="Главный слайдер"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container hero-carousel">
        <button
          type="button"
          className="hero-arrow hero-arrow--prev"
          aria-label="Предыдущий слайд"
          onClick={prev}
        >
          <ChevronLeft size={22} strokeWidth={1.2} />
        </button>

        <div
          className="hero-slider"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="hero-slides">
            {activeSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`hero-slide${index === current ? ' hero-slide--active' : ''}`}
                aria-hidden={index !== current}
              >
                <img
                  className="hero-slide-img"
                  src={slide.image}
                  alt=""
                  draggable={false}
                />
                <div className="hero-slide-overlay" />
                <div className="hero-slide-copy">
                  {slide.eyebrow && <p className="hero-eyebrow">{slide.eyebrow}</p>}
                  {slide.headline && <h1 className="hero-headline">{slide.headline}</h1>}
                  {slide.title && (
                    <p className="hero-title">
                      {slide.title.split('\n').map((line, lineIndex) => (
                        <span key={lineIndex}>
                          {line}
                          {lineIndex < slide.title!.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  )}
                  {slide.subtitle && (
                    <p className="hero-subtitle">
                      {slide.subtitle.split('\n').map((line, lineIndex) => (
                        <span key={lineIndex}>
                          {line}
                          {lineIndex < slide.subtitle!.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                  )}
                  <Link className="hero-btn" href={slide.href}>
                    {slide.cta} <ArrowRight size={15} strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-pagination" role="tablist" aria-label="Слайды">
            {activeSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === current}
                aria-label={`Слайд ${index + 1}`}
                className={`hero-dot${index === current ? ' hero-dot--active' : ''}`}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          className="hero-arrow hero-arrow--next"
          aria-label="Следующий слайд"
          onClick={next}
        >
          <ChevronRight size={22} strokeWidth={1.2} />
        </button>
      </div>
    </section>
  );
}
