import React from 'react';

const SkeletonWidget = ({
  title,
  height = '150px',
}: {
  title: string;
  height?: string;
}) => (
  <div
    style={{
      padding: 'var(--space-md)',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      animation: 'pulse 1.5s infinite ease-in-out',
    }}
  >
    <style jsx>{`
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `}</style>
    <div
      style={{
        height: '20px',
        width: '60%',
        background: 'var(--color-border)',
        borderRadius: '4px',
      }}
    ></div>
    <div
      style={{
        height: height,
        width: '100%',
        background: 'var(--color-background)',
        borderRadius: '8px',
      }}
    ></div>
  </div>
);

export default SkeletonWidget;
