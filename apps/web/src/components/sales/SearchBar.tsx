'use client';

import { useState } from 'react';
import { getPrediction } from '../../lib/searchUtils';

export default function SearchBar({
  onSearch,
  products,
}: {
  onSearch: (term: string) => void;
  products: any[];
}) {
  const [term, setTerm] = useState('');
  const prediction = getPrediction(products, term);
  const displayPrediction = prediction.startsWith(term)
    ? prediction.slice(term.length)
    : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTerm(value);
    onSearch(value);
  };

  return (
    <div
      style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}
    >
      <div
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          padding: '0.9rem 1.35rem',
          boxSizing: 'border-box',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center', // Alineación vertical
          lineHeight: '1', // Forzar altura de línea neutra
          marginTop: '2px', // Ajuste fino: subido 3px desde el anterior
        }}
      >
        <span
          style={{
            color: 'transparent',
            font: 'inherit',
            lineHeight: 'inherit', // Heredar
          }}
        >
          {term}
        </span>
        <span
          style={{
            color: '#a0a0a0',
            font: 'inherit',
            lineHeight: 'inherit', // Heredar
            paddingLeft: '1px', // Añadir 1px de separación a la derecha
          }}
        >
          {displayPrediction}
        </span>
      </div>
      <input
        type="text"
        placeholder="Buscar producto..."
        value={term}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '0.9rem 1.35rem',
          borderRadius: '50px',
          border: '1px solid var(--color-border)',
          backgroundColor: 'transparent', // Make transparent to show prediction
          color: 'var(--color-text)',
          boxShadow: 'var(--shadow-soft)',
          fontSize: '0.9rem',
          outline: 'none',
          transition: 'all 0.3s ease',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      />
    </div>
  );
}
