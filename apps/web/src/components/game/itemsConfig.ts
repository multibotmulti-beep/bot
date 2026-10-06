// src/components/game/itemsConfig.ts
export interface GameItem {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  imageSrc: string; // Puede ser SVG inline o URL a PNG
  isPng: boolean;
}

export const CATALOG: GameItem[] = [
  {
    id: '1',
    name: 'Gaseosa',
    price: 1500,
    barcode: '779001',
    imageSrc: '/items/gaseosa.png',
    isPng: true,
  },
  {
    id: '2',
    name: 'Yerba',
    price: 3000,
    barcode: '779002',
    imageSrc: '/items/yerba.png',
    isPng: true,
  },
  {
    id: '3',
    name: 'Alfajor',
    price: 800,
    barcode: '779003',
    imageSrc: '/items/alfajor.png',
    isPng: true,
  },
  {
    id: '4',
    name: 'Galletitas',
    price: 1200,
    barcode: '779004',
    imageSrc: '/items/galletitas.png',
    isPng: true,
  },
  {
    id: '5',
    name: 'Tomate',
    price: 500,
    barcode: null,
    imageSrc: '/items/tomate.png',
    isPng: true,
  },
];
