export const MOCK_CATEGORIES = [
  { id: 'cat1', name: 'Verduras', icon: 'stock' }, // Reutilizamos icono de stock para verduras
  { id: 'cat2', name: 'Carnes', icon: 'sales' }, // Reutilizamos icono de ventas para carnes
  { id: 'cat3', name: 'Sueltos', icon: 'settings' }, // Reutilizamos icono de settings para sueltos
  { id: 'cat4', name: 'Bebidas', icon: 'info' }, // Reutilizamos icono de info para bebidas
];

export const MOCK_PRODUCTS = {
  cat1: [
    { code: 'V-001', name: 'Tomate', price: 2.5, unit: 'kg' },
    { code: 'V-002', name: 'Lechuga', price: 1.2, unit: 'un' },
  ],
  cat2: [
    { code: 'C-001', name: 'Carne Molida', price: 8.0, unit: 'kg' },
    { code: 'C-002', name: 'Pollo Entero', price: 5.5, unit: 'un' },
  ],
  cat3: [
    { code: 'S-001', name: 'Arroz', price: 1.5, unit: 'kg' },
    { code: 'S-002', name: 'Azúcar', price: 1.2, unit: 'kg' },
  ],
};
