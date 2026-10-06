'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, LEVEL_CONFIG } from './gameEngine';
import { CATALOG } from './itemsConfig';
import { MONEY_ICON } from './moneyIcon';
import { PROFILE_ICON } from './profileIcon';

const CLIENT_PROFILES = [
  { type: 'Calmado', itemsMin: 5, itemsMax: 8, speedFactor: 0.8 },
  { type: 'Apurado', itemsMin: 10, itemsMax: 15, speedFactor: 1.5 },
  { type: 'CompraGrande', itemsMin: 15, itemsMax: 20, speedFactor: 1.0 },
];

export default function ArcadeGame() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const profile =
      CLIENT_PROFILES[Math.floor(Math.random() * CLIENT_PROFILES.length)];
    return {
      score: 0,
      level: 1,
      isPaused: false,
      activeItems: [],
      currentClient: {
        id: '1',
        items: [],
        paymentAmount: 0,
        totalPurchase: 0,
        targetItems:
          Math.floor(
            Math.random() * (profile.itemsMax - profile.itemsMin + 1)
          ) + profile.itemsMin,
        typeName: profile.type,
      },
      status: 'scanning',
    };
  });

  const [scannerPos, setScannerPos] = useState({ x: 0, y: 0 });
  const [changeInput, setChangeInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);

  const scannerPosRef = useRef(scannerPos);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    scannerPosRef.current = scannerPos;
    gameStateRef.current = gameState;
  }, [scannerPos, gameState]);

  const animate = useCallback((time: number) => {
    if (gameStateRef.current.status !== 'scanning') return;

    setGameState((prev) => {
      let newTotalPurchase = prev.currentClient?.totalPurchase || 0;
      let newItems = prev.currentClient?.items || [];

      const updatedItems = prev.activeItems
        .map((item) => ({ ...item, y: item.y + item.speed }))
        .filter((item) => {
          // ESCANER: Núcleo central 20x10
          const scannerRect = {
            x: scannerPosRef.current.x + 40,
            y: scannerPosRef.current.y + 25,
            w: 20,
            h: 10,
          };

          // CODIGO BARRAS: Núcleo central 20x10
          const barcodeRect = { x: item.x + 50, y: item.y + 130, w: 20, h: 10 };

          // Detección estricta de colisión
          const isColliding =
            barcodeRect.x < scannerRect.x + scannerRect.w &&
            barcodeRect.x + barcodeRect.w > scannerRect.x &&
            barcodeRect.y < scannerRect.y + scannerRect.h &&
            barcodeRect.y + barcodeRect.h > scannerRect.y;

          if (isColliding && item.isScannable) {
            newTotalPurchase += item.price;
            newItems = [
              ...newItems,
              { name: item.name, price: item.price } as any,
            ];
            setScannedFeedback('OK');
            setTimeout(() => setScannedFeedback(null), 500);
            return false;
          }
          return item.y < 800;
        });

      if (Math.random() < 0.02) {
        const itemConfig = CATALOG[Math.floor(Math.random() * CATALOG.length)];
        updatedItems.push({
          id: itemConfig.id + Math.random(),
          name: itemConfig.name,
          barcode: itemConfig.barcode,
          price: itemConfig.price,
          svgIcon: itemConfig.imageSrc,
          isScannable: !!itemConfig.barcode,
          x: Math.random() * 300,
          y: -100,
          speed:
            2 *
            LEVEL_CONFIG[prev.level - 1].speedMultiplier *
            (prev.currentClient?.speedFactor || 1),
        });
      }

      const target = prev.currentClient?.targetItems || 10;
      const newStatus = newItems.length >= target ? 'summary' : 'scanning';

      return {
        ...prev,
        activeItems: updatedItems,
        status: newStatus as any,
        currentClient: prev.currentClient
          ? {
              ...prev.currentClient,
              totalPurchase: newTotalPurchase,
              items: newItems,
            }
          : null,
      };
    });

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (gameState.status === 'scanning') {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState.status, animate]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      setScannerPos({
        x: e.clientX - rect.left - 50,
        y: e.clientY - rect.top - 80,
      });
    }
  };

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (gameState.status === 'paying') {
      const limit =
        LEVEL_CONFIG[Math.min(gameState.level - 1, LEVEL_CONFIG.length - 1)]
          .timeLimit;
      setTimeLeft(limit);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handlePaymentSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.status, gameState.level]);

  const handlePaymentSubmit = (isTimeout = false) => {
    const total = gameState.currentClient?.totalPurchase || 0;

    let moneyAdjustment = 0;
    let message = '';

    if (isTimeout) {
      message = '¡Tiempo agotado! Cliente se fue sin pagar.';
      moneyAdjustment = -total;
    } else {
      const payment =
        Math.ceil(total / 100) * 100 + (Math.random() > 0.5 ? 0 : 50);
      const expectedChange = payment - total;
      const userChange = parseFloat(changeInput);
      const diff = expectedChange - userChange;

      if (diff === 0) {
        message = '¡Exacto! Venta exitosa.';
        moneyAdjustment = total;
      } else if (diff < 0) {
        message = `Diste vuelto de más. Pérdida: $${Math.abs(diff)}`;
        moneyAdjustment = total + diff;
      } else {
        message = `Vuelto de menos. Cliente insatisfecho.`;
        moneyAdjustment = total;
      }
    }

    setFeedback(message);

    setTimeout(() => {
      const newProfile =
        CLIENT_PROFILES[Math.floor(Math.random() * CLIENT_PROFILES.length)];
      setGameState((prev) => ({
        ...prev,
        score: prev.score + moneyAdjustment,
        level: Math.min(prev.level + 1, LEVEL_CONFIG.length),
        status: 'scanning',
        activeItems: [],
        currentClient: {
          id: Math.random().toString(),
          items: [],
          paymentAmount: 0,
          totalPurchase: 0,
          targetItems:
            Math.floor(
              Math.random() * (newProfile.itemsMax - newProfile.itemsMin + 1)
            ) + newProfile.itemsMin,
          typeName: newProfile.type,
          speedFactor: newProfile.speedFactor,
        },
      }));

      setChangeInput('');
      setFeedback('');
    }, 2000);
  };

  if (CATALOG.length === 0)
    return (
      <div style={{ padding: '2rem' }}>
        No hay productos definidos en el catálogo.
      </div>
    );

  if (gameState.status === 'summary') {
    return (
      <div
        style={{
          padding: '1rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-background)',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            color: '#000',
            padding: '1.5rem',
            borderRadius: '20px',
            width: '300px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0' }}>Ticket de Venta</h2>
          <div
            style={{
              flexGrow: 1,
              maxHeight: '250px',
              overflowY: 'auto',
              marginBottom: '1rem',
              border: '1px solid #ccc',
              padding: '1rem',
              textAlign: 'left',
            }}
          >
            {gameState.currentClient?.items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.2rem',
                }}
              >
                <span>{item.name}</span>
                <span>${item.price}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            <strong>Total: ${gameState.currentClient?.totalPurchase}</strong>
          </p>
          <button
            style={{
              padding: '10px',
              fontSize: '1rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4caf50',
              color: 'white',
              cursor: 'pointer',
            }}
            onClick={() =>
              setGameState((prev) => ({
                ...prev,
                status: 'paying',
                currentClient: {
                  ...prev.currentClient!,
                  paymentAmount:
                    Math.ceil(prev.currentClient!.totalPurchase / 100) * 100 +
                    (Math.random() > 0.5 ? 0 : 50),
                },
              }))
            }
          >
            Ir a cobrar
          </button>
        </div>
      </div>
    );
  }

  if (gameState.status === 'paying') {
    const numbers = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'C',
      '0',
      'OK',
    ];
    return (
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-background)',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            color: '#000',
            padding: '1.5rem',
            borderRadius: '20px',
            width: '300px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0' }}>Cobrar</h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            <span>Total:</span>{' '}
            <strong>${gameState.currentClient?.totalPurchase}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            <span>Paga con:</span>{' '}
            <strong>${gameState.currentClient?.paymentAmount}</strong>
          </div>
          <div
            style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              margin: '1rem 0',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '5px',
            }}
          >
            {changeInput || '0.00'}
          </div>
          <div
            style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}
          >
            Tiempo: {timeLeft}s
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {numbers.map((num) => (
              <button
                key={num}
                style={{
                  padding: '10px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  border: '1px solid #ddd',
                  backgroundColor:
                    num === 'OK'
                      ? '#4caf50'
                      : num === 'C'
                        ? '#f44336'
                        : '#f9f9f9',
                }}
                onClick={() => {
                  if (num === 'C') setChangeInput('');
                  else if (num === 'OK') handlePaymentSubmit(false);
                  else setChangeInput((prev) => prev + num);
                }}
              >
                {num}
              </button>
            ))}
          </div>
          <p
            style={{
              marginTop: '1rem',
              minHeight: '1.2rem',
              color:
                feedback.includes('Incorrecto') || feedback.includes('agotado')
                  ? 'red'
                  : 'green',
            }}
          >
            {feedback}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gameAreaRef}
      onPointerMove={handlePointerMove}
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 120px)',
        backgroundColor: 'var(--color-background)',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div dangerouslySetInnerHTML={{ __html: MONEY_ICON }} />
          <p style={{ margin: 0 }}>${gameState.score}</p>
        </div>
      </div>

      {/* Perfil de Cliente */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '10px',
          borderRadius: '8px',
          border: '2px solid #333',
          textAlign: 'center',
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: PROFILE_ICON }} />
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          {gameState.currentClient?.typeName}
        </div>
      </div>

      {/* Ítems cayendo */}
      {gameState.activeItems.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid cyan', // Borde depuración Ítem
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: item.svgIcon }} />
          {item.isScannable && (
            <div
              style={{
                position: 'absolute',
                left: 20, // Mantener offset original
                top: 125, // Mantener offset original
                width: '80px',
                height: '15px',
                backgroundColor: 'black',
                marginTop: '5px',
                backgroundImage:
                  'repeating-linear-gradient(90deg, white, white 2px, black 2px, black 4px)',
                border: '1px solid yellow', // Borde visual Código Barras
              }}
            />
          )}
          {/* PUNTO CENTRAL CODIGO BARRAS - AMARILLO */}
          <div
            style={{
              position: 'absolute',
              left: 20 + 40 - 3, // left visual (20) + w/2 (40) - radio (3)
              top: 125 + 7.5 - 3, // top visual (125) + h/2 (7.5) - radio (3)
              width: '6px',
              height: '6px',
              backgroundColor: 'yellow',
              borderRadius: '50%',
              pointerEvents: 'none',
              zIndex: 30,
            }}
          />
        </div>
      ))}

      {/* Escáner (Celular) con línea de escaneo y borde de depuración completo */}
      <div
        style={{
          position: 'absolute',
          left: scannerPos.x,
          top: scannerPos.y,
          width: '100px',
          height: '160px',
          backgroundColor: '#222',
          borderRadius: '15px',
          border: '4px solid #444',
          outline: '3px solid magenta', // Depuración del contorno total
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            width: '90%',
            height: '30px',
            background: scannedFeedback
              ? 'rgba(0, 255, 0, 0.3)'
              : 'rgba(0, 0, 0, 0.2)',
            marginTop: '15px',
            border: '2px solid',
            borderColor: scannedFeedback ? '#0f0' : '#f00',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: scannedFeedback ? '#0f0' : '#f00',
            fontWeight: 'bold',
            fontSize: '10px',
          }}
        >
          {scannedFeedback || '--- LASER ---'}
        </div>
      </div>
    </div>
  );
}
