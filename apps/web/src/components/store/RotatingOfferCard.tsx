'use client';
import React, { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';

export function RotatingOfferCard({
  offers,
  toggleExpand,
  expandedId,
  addToCart,
}: {
  offers: any[];
  toggleExpand: (id: string) => void;
  expandedId: string | null;
  addToCart: any;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (offers.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [offers]);

  if (offers.length === 0) return null;

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 0 10px rgba(255, 165, 0, 0.3)', // Glow naranja suave
        transition: 'box-shadow 0.3s ease-in-out',
      }}
    >
      <ProductCard
        product={offers[currentIndex]}
        toggleExpand={toggleExpand}
        expanded={expandedId === offers[currentIndex].id}
        addToCart={addToCart}
      />
    </div>
  );
}
