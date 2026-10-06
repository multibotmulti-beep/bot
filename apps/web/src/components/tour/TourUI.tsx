'use client';

import { useTour } from './TourProvider';
import { useState, useLayoutEffect } from 'react';

export default function TourUI() {
  const {
    isTourActive,
    currentStep,
    endTour,
    showExitConfirmation,
    cancelExit,
    confirmExit,
  } = useTour();
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Memoizar endTour para usarlo en el efecto sin recrear el efecto constantemente
  const endTourMemoized = endTour;

  useLayoutEffect(() => {
    if (!isTourActive || !currentStep) {
      setPosition(null);
      return;
    }

    let retryCount = 0;
    const updatePosition = () => {
      const element = document.querySelector(currentStep.targetSelector);
      const dockElement = document.querySelector('nav');
      if (element) {
        retryCount = 0;
        const rect = element.getBoundingClientRect();

        let targetPosition = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        // Si es el primer paso, calculamos la posición del Dock para el tooltip
        if (currentStep.id === 'step1' && dockElement) {
          const dockRect = dockElement.getBoundingClientRect();
          // Guardamos la posición del Dock en un estado temporal o calculamos dinámicamente
          // Para no romper la estructura, calculamos la posición basada en el dock directamente aquí
          // Pero la posición del tooltip se calcula abajo.
        }

        setPosition(targetPosition);
      } else if (retryCount < 20) {
        retryCount++;
        setTimeout(updatePosition, 200);
      } else {
        endTourMemoized();
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isTourActive, currentStep, endTourMemoized]);

  if (!isTourActive || !currentStep || !position) return null;

  // Lógica de posicionamiento del tooltip
  const dockElement = document.querySelector('nav');
  const dockRect = dockElement ? dockElement.getBoundingClientRect() : null;

  const tooltipWidth = 200;
  const isNearRightEdge =
    position.left + position.width + tooltipWidth > window.innerWidth;

  // Configuración individualizada por paso
  const getPositionConfig = (stepId: string) => {
    if (stepId === 'step1' && dockRect) {
      return {
        top: dockRect.top - 70,
        left: dockRect.left + dockRect.width / 2,
        transform: 'translateX(-50%)',
      };
    }
    if (stepId === 'step2') {
      // Agregar producto -> Izquierda
      return {
        top: position.top + position.height / 2,
        left: position.left - 10,
        transform: 'translateY(-50%) translateX(-100%)',
      };
    }
    if (stepId === 'sales_step1' || stepId === 'sales_step2') {
      // Ventas -> Derecha (excepto pasos 5 y 6)
      return {
        top: position.top + position.height / 2,
        left: position.left + position.width + 10,
        transform: 'translateY(-50%)',
      };
    }
    // Por defecto -> Arriba (incluye theme_step1)
    return {
      top: position.top - 70,
      left: position.left + position.width / 2,
      transform: 'translateX(-50%)',
    };
  };

  const config = getPositionConfig(currentStep.id);

  const tooltipStyle = {
    position: 'fixed' as const,
    top: config.top,
    left: config.left,
    transform: config.transform,
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: 'var(--radius-lg)',
    zIndex: 10000,
    boxShadow: 'var(--shadow-soft)',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
    fontSize: '0.9rem',
    fontWeight: 600,
    pointerEvents: 'none' as const,
    transition: 'all 0.2s ease-out',
  };

  return (
    <>
      {showExitConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-tour-confirmation="true"
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <p style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>
              ¿Quieres cerrar las instrucciones?
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={cancelExit}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Continuar
              </button>
              <button
                onClick={confirmExit}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight: Efecto original de resplandor */}
      <div
        style={{
          position: 'fixed',
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          borderRadius:
            currentStep.id === 'step1' ||
            currentStep.id === 'step2' ||
            currentStep.id === 'sales_step4'
              ? '50%'
              : 'var(--radius-md)',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow:
            '0 0 15px 5px rgba(var(--color-primary-rgb, 66, 133, 244), 0.5)',
          transition: 'all 0.2s ease-out',
        }}
      />
      {/* Tooltip: Se posiciona sobre el Dock si es paso 1 */}
      <div style={tooltipStyle} data-tour-tooltip="true">
        {currentStep.id === 'step1' ? (
          <>
            ¡Bienvenido!
            <br />
            Empieza creando tu stock.
          </>
        ) : (
          (() => {
            const words = currentStep.message.split(' ');
            const middle = Math.ceil(words.length / 2);
            return (
              <>
                {words.slice(0, middle).join(' ')}
                <br />
                {words.slice(middle).join(' ')}
              </>
            );
          })()
        )}
      </div>
    </>
  );
}
