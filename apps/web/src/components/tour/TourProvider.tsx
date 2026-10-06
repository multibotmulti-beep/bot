'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react';
import { guides } from '../../lib/guides';

export interface GuideStep {
  id: string;
  message: string;
  targetSelector: string; // CSS selector
  triggerEvent: string; // The event that moves to the next step
}

export interface GuideFlow {
  id: string;
  steps: GuideStep[];
}

interface TourContextType {
  isTourActive: boolean;
  showExitConfirmation: boolean;
  startTour: (flow: GuideFlow) => void;
  endTour: () => void;
  cancelExit: () => void;
  confirmExit: () => void;
  toggleTourActivation: () => void;
  triggerEvent: (eventName: string) => void;
  currentStep: GuideStep | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentFlow, setCurrentFlow] = useState<GuideFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // ... (otros useEffects)

  const startTour = (flow: GuideFlow) => {
    if (isEnabled) {
      setCurrentFlow(flow);
      setCurrentStepIndex(0);
      setIsTourActive(true);
    }
  };
  const endTour = useCallback(() => {
    setIsTourActive(false);

    // Persistir que el tour de ventas fue completado
    if (currentFlow?.id === 'sales-guide') {
      localStorage.setItem('salesTourCompleted', 'true');
    }

    setCurrentFlow(null);
    setCurrentStepIndex(0);
    setShowExitConfirmation(false);
  }, [currentFlow]);

  const cancelExit = () => setShowExitConfirmation(false);
  const confirmExit = () => endTour();

  const toggleTourActivation = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('tourEnabled', String(newState));
  };

  const triggerEvent = useCallback(
    (eventName: string) => {
      console.log(
        `[Tour Debug] Evento recibido: ${eventName}, Activo: ${isTourActive}`
      );

      // Lógica especial: al guardar, cambiar a ventas y redirigir
      if (eventName === 'product_saved') {
        // Verificar si el tour de ventas ya fue finalizado
        const isSalesTourCompleted =
          localStorage.getItem('salesTourCompleted') === 'true';

        // Solo redirigir y activar tour si no se ha completado
        if (!isSalesTourCompleted) {
          // Redirigir al panel de ventas
          window.dispatchEvent(new CustomEvent('navigate_to_sales'));

          // Esperar a que la página cambie antes de activar el tour
          const startTourHandler = () => {
            setCurrentFlow(guides.salesTour);
            setCurrentStepIndex(0);
            setIsTourActive(true);
            window.removeEventListener('start_sales_tour', startTourHandler);
          };
          window.addEventListener('start_sales_tour', startTourHandler);
        }
        return;
      }

      if (!isTourActive || !currentFlow) return;

      const currentStep = currentFlow.steps[currentStepIndex];
      console.log(
        `[Tour Debug] Paso actual: ${currentStepIndex}, ID paso: ${currentStep?.id}, Evento esperado: ${currentStep?.triggerEvent}`
      );

      if (currentStep && currentStep.triggerEvent === eventName) {
        if (currentStepIndex < currentFlow.steps.length - 1) {
          console.log(`[Tour Debug] Avanzando al siguiente paso`);
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          console.log(`[Tour Debug] Tour finalizado`);
          endTour(); // Tour completed
        }
      } else {
        console.log(`[Tour Debug] Evento no coincide o paso no encontrado`);
      }
    },
    [isTourActive, currentFlow, currentStepIndex, endTour]
  );

  // Listener global para detectar clics en elementos objetivo
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isTourActive || !currentFlow) return;

      const currentStep = currentFlow.steps[currentStepIndex];
      if (!currentStep) return;

      const target = e.target as HTMLElement;

      // Verificar si el clic fue en el elemento objetivo o uno de sus hijos
      const isTarget =
        target.matches(currentStep.targetSelector) ||
        target.closest(currentStep.targetSelector);

      // Verificar si el clic fue sobre el tooltip o el modal de confirmación
      const isTooltip = target.closest('[data-tour-tooltip="true"]');
      const isConfirmation = target.closest('[data-tour-confirmation="true"]');

      if (isTarget) {
        console.log(
          `[Tour Debug] Clic detectado en elemento objetivo: ${currentStep.targetSelector}`
        );
        triggerEvent(currentStep.triggerEvent);
      } else if (!isTooltip && !isConfirmation) {
        // Clic fuera, solicitar confirmación
        console.log(`[Tour Debug] Clic fuera, solicitando confirmación`);
        setShowExitConfirmation(true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isTourActive, currentFlow, currentStepIndex, triggerEvent]);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        showExitConfirmation,
        startTour,
        endTour,
        cancelExit,
        confirmExit,
        toggleTourActivation,
        triggerEvent,
        currentStep: currentFlow?.steps[currentStepIndex] || null,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error('useTour must be used within a TourProvider');
  return context;
}
