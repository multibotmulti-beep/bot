// src/components/loading/Spinner.tsx
export default function Spinner() {
  return (
    <div
      style={{
        border: '4px solid var(--color-border)',
        borderTop: '4px solid var(--color-primary)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
      }}
    >
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
