// src/components/game/gameEngine.ts

export interface StockItem {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  svgIcon: string;
  isScannable: boolean;
}

export interface FallingItem extends StockItem {
  x: number;
  y: number;
  speed: number;
}

export interface ClientProfile {
  id: string;
  items: any[];
  paymentAmount: number;
  totalPurchase: number;
  targetItems: number;
  typeName: string;
  speedFactor?: number;
}

export interface GameState {
  score: number;
  level: number;
  isPaused: boolean;
  activeItems: FallingItem[];
  currentClient: ClientProfile | null;
  status: 'scanning' | 'paying' | 'gameOver' | 'summary';
}

// Configuración de niveles
export const LEVEL_CONFIG = [
  {
    level: 1,
    speedMultiplier: 0.5,
    launchRate: 2500,
    maxPaymentVariation: 10,
    timeLimit: 30,
    targetScore: 100,
  },
  {
    level: 2,
    speedMultiplier: 0.8,
    launchRate: 2000,
    maxPaymentVariation: 50,
    timeLimit: 25,
    targetScore: 150,
  },
  {
    level: 3,
    speedMultiplier: 1.2,
    launchRate: 1500,
    maxPaymentVariation: 100,
    timeLimit: 20,
    targetScore: 200,
  },
  {
    level: 4,
    speedMultiplier: 1.8,
    launchRate: 1000,
    maxPaymentVariation: 500,
    timeLimit: 15,
    targetScore: 250,
  },
];
