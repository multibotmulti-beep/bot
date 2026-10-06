'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

type CartItem = {
  code: string;
  name: string;
  price: number;
  qty: number;
  stock: number;
  category?: string;
  metadata?: any;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (code: string) => void;
  updateQuantity: (code: string, delta: number) => void;
  clearCart: () => void;
  paymentMethod: 'efectivo' | 'transferencia' | null;
  setPaymentMethod: (method: 'efectivo' | 'transferencia') => void;
  shippingOption: 'retiro' | 'envio' | null;
  setShippingOption: (option: 'retiro' | 'envio') => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    'efectivo' | 'transferencia' | null
  >(null);
  const [shippingOption, setShippingOption] = useState<
    'retiro' | 'envio' | null
  >(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsapp_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.code === product.code);
      if (existing) {
        if (existing.qty < product.stock) {
          return prev.map((i) =>
            i.code === product.code ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return prev;
      }
      return [
        ...prev,
        {
          code: product.code,
          name: product.name,
          price: Number(product.price),
          qty: 1,
          stock: product.stock,
          category: product.category,
          metadata: product.metadata,
        },
      ];
    });
  };

  const removeFromCart = (code: string) => {
    setItems((prev) => prev.filter((i) => i.code !== code));
  };

  const updateQuantity = (code: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.code === code) {
            const newQty = Math.max(0, i.qty + delta);
            return newQty > i.stock ? i : { ...i, qty: newQty };
          }
          return i;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        paymentMethod,
        setPaymentMethod,
        shippingOption,
        setShippingOption,
        isExpanded,
        setIsExpanded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
