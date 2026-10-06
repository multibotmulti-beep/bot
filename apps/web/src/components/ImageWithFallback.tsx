'use client';
import { useState, memo } from 'react';

export const ImageWithFallback = memo(
  ({
    src,
    alt,
    style,
    className,
  }: {
    src?: string;
    alt: string;
    style?: any;
    className?: string;
  }) => {
    const [error, setError] = useState(false);

    // DEBUG
    if (src && !error) console.log('DEBUG ImageWithFallback loading:', src);
    if (error) console.log('DEBUG ImageWithFallback error loading:', src);

    // SVG placeholder atractivo
    const fallbackSvg = `data:image/svg+xml;charset=UTF-8,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='20' fill='%23aaa' text-anchor='middle'%3E${alt}%3C/text%3E%3C/svg%3E`;

    return (
      <img
        src={error || !src ? fallbackSvg : src}
        alt={alt}
        onError={(e) => {
          // Solo marcar error si la fuente original (no el placeholder) falla
          if (src && src !== fallbackSvg) {
            console.debug('DEBUG ImageWithFallback Error Event:', e);
            setError(true);
          }
        }}
        style={style}
        className={className}
      />
    );
  }
);

ImageWithFallback.displayName = 'ImageWithFallback';
