'use client';

import './SalesPanel.css';
import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { LocalStorageSync } from '../../lib/localStorageSync'; // Importar servicio
import { searchProducts } from '../../lib/searchUtils';
import SearchBar from './SearchBar';
import CartList from './CartList';
import CategoryGrid from './CategoryGrid';
import QuickProductModal from './QuickProductModal';
import { useLoading } from '../loading/LoadingProvider';
import { useToast } from '../toast/ToastProvider';

const SALES_PRODUCTS_STORAGE_KEY = 'sales_products_data';

export default function SalesPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState(
    () => LocalStorageSync.getData(SALES_PRODUCTS_STORAGE_KEY) || []
  );
  const [searchTerm, setSearchTerm] = useState('');

  const { addToast } = useToast();

  // Helper para obtener stock de forma robusta
  const getProductStock = (p: any) =>
    p.qty != null ? Number(p.qty) : p.stock != null ? Number(p.stock) : 0;

  // Extraer categorías únicas dinámicamente de los productos cargados
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ).map((name) => ({ id: String(name), name: String(name), icon: 'sales' }));

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );

  // Sincronizar selectedCategoryId si las categorías cambian
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { startLoading, stopLoading } = useLoading();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'BARCODE_SCANNED') {
          const code = data.code;
          const product = products.find((p: any) => p.code === code);
          if (product) {
            handleAddToCart(product, 1);
          } else {
            addToast(`Producto no encontrado: ${code}`, 'error');
          }
        }
      } catch (e) {
        console.error('Error parsing message from Native:', e);
      }
    };

    window.addEventListener('message', handleMessage);
    (window as any).document.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      (window as any).document.removeEventListener('message', handleMessage);
    };
  }, [products]);

  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  const fetchAvailableProducts = async () => {
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.list', params: {} }),
      });
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
        LocalStorageSync.saveData(SALES_PRODUCTS_STORAGE_KEY, result.data); // Persistir
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
    }
  };
  const handleAddToCart = (product: any, qty: number) => {
    // Buscar la versión más reciente del producto en el estado 'products'
    const latestProduct =
      products.find((p) => p.code === product.code) || product;
    const stockDisponible = getProductStock(latestProduct);

    const currentItem = items.find((i) => i.code === latestProduct.code);
    const currentQty = currentItem ? currentItem.qty : 0;

    if (currentQty + qty > stockDisponible) {
      return;
    }

    setItems((prev) => {
      const exists = prev.find((i) => i.code === latestProduct.code);
      if (exists) {
        return prev.map((i) =>
          i.code === latestProduct.code ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...latestProduct, qty, stock: stockDisponible }];
    });
    setSelectedProduct(null);
  };

  const handleUpdateQty = (code: string, delta: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.code === code);
      if (!item) return prev;

      const newQty = item.qty + delta;
      if (newQty <= 0) return prev.filter((i) => i.code !== code);

      // Validar contra producto
      const product = products.find((p) => p.code === code);
      const stockDisponible = getProductStock(product || {});

      if (product && newQty > stockDisponible) {
        return prev; // No permitir incrementar si supera el stock
      }

      return prev.map((i) => (i.code === code ? { ...i, qty: newQty } : i));
    });
  };

  const handleCheckout = async () => {
    startLoading();
    try {
      // 1. Estructura del resumen que el backend debe almacenar
      const ticketResumen = {
        items: items.map((item) => ({
          producto: item.name,
          cantidad: item.qty,
          monto: item.price * item.qty,
        })),
        total_ticket: total,
        fecha: new Date().toISOString(),
      };

      // 2. Enviamos el resumen junto con la venta según nueva documentación
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'sales.checkout',
          params: {
            items: items.map((i) => ({
              code: i.code,
              qty: i.qty,
              price: i.price,
            })),
            ticket: ticketResumen,
            customerId: 'CUST-1',
            clientTimestamp: new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setItems([]);
        addToast('Venta realizada con éxito', 'success');
        fetchAvailableProducts(); // Refrescar stock inmediatamente
      } else {
        addToast('Error: ' + result.message, 'error');
      }
    } catch (error) {
      console.error(error);
    }
    stopLoading();
  };

  const filteredProducts = searchTerm
    ? searchProducts(products, searchTerm)
    : [];

  const currentProducts = selectedCategoryId
    ? products.filter((p) => p.category === selectedCategoryId)
    : [];

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div
      className="sales-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden', // Evita scroll en el padre
      }}
    >
      {/* Capa de enfoque cuando hay búsqueda activa */}
      {searchTerm && (
        <div
          onClick={() => setSearchTerm('')}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 5,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Buscador Fijo */}
      <div
        className="search-area"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: 'var(--color-background)',
          padding: 'var(--space-sm)',
          height: '60px', // Altura fija
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'relative' }}>
          <SearchBar onSearch={setSearchTerm} products={products} />

          {/* Resultados Flotantes */}
          {searchTerm && filteredProducts.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                maxHeight: '40vh',
                overflowY: 'auto',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-card)',
                padding: 'var(--space-xs)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                zIndex: 100,
              }}
            >
              {filteredProducts.map((p: any, index: number) => {
                const stock = getProductStock(p);
                return (
                  <button
                    key={`${p.code || 'unknown'}-${index}`}
                    disabled={stock <= 0}
                    onClick={() => {
                      handleAddToCart(p, 1);
                      setSearchTerm('');
                    }}
                    style={{
                      padding: 'var(--space-sm)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-background)',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      color: 'var(--color-text)',
                      width: '100%',
                      cursor: stock <= 0 ? 'not-allowed' : 'pointer',
                      opacity: stock <= 0 ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>
                        {p.name} {stock <= 0 ? '(Agotado)' : ''}
                      </span>
                      <span
                        style={{
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        ${p.price}
                      </span>
                    </div>
                    {/* Metadata Preview Filtrado */}
                    {p.metadata && Object.keys(p.metadata).length > 0 && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#666',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        {Object.entries(p.metadata)
                          .filter(
                            ([key]) =>
                              ![
                                'imagen',
                                'img',
                                'image',
                                'images',
                                'is_offer',
                                'discount_percent',
                              ].includes(key.toLowerCase())
                          )
                          .slice(0, 3)
                          .map(([key, val]) => `${key}: ${val}`)
                          .join(' | ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        className="categories-area"
        style={{ marginTop: '60px' }} // Compensar buscador fijo
      >
        <CategoryGrid
          categories={categories}
          onSelectCategory={setSelectedCategoryId}
          selectedCategoryId={selectedCategoryId}
        />
      </div>

      <div className="products-area" style={{ flex: 1, overflowY: 'auto' }}>
        {currentProducts.map((p: any) => {
          const stock = getProductStock(p);
          return (
            <button
              key={p.code}
              disabled={stock <= 0}
              onClick={() => handleAddToCart(p, 1)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: stock <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'left',
                boxShadow: 'var(--shadow-soft)',
                fontSize: '0.75rem',
                height: '100px', // Altura fija
                width: '120px', // Ancho fijo
                boxSizing: 'border-box',
                opacity: stock <= 0 ? 0.5 : 1,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {p.name} {stock <= 0 ? '(Agotado)' : ''}
              </span>

              {/* Metadata Preview Filtrado - Formato Lista */}
              {p.metadata && Object.keys(p.metadata).length > 0 && (
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#888',
                    marginTop: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                  }}
                >
                  {Object.entries(p.metadata)
                    .filter(
                      ([key]) =>
                        ![
                          'imagen',
                          'img',
                          'image',
                          'images',
                          'is_offer',
                          'discount_percent',
                        ].includes(key.toLowerCase())
                    )
                    .slice(0, 3)
                    .map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {key}: {String(val)}
                      </div>
                    ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                }}
              >
                <span
                  style={{
                    color: 'var(--color-secondary)',
                    fontSize: '0.7rem',
                  }}
                >
                  {p.unit || 'u'}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  ${Number(p.price).toFixed(0)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="cart-budget-card">
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <CartList
            items={items}
            onUpdateQty={handleUpdateQty}
            products={products}
          />
        </div>
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: 'var(--space-md)',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 'var(--space-md)',
            }}
          >
            <span
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                marginRight: '1rem',
              }}
            >
              Total:
            </span>
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: '800',
                color: 'var(--color-primary)',
              }}
            >
              ${total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            className="btn-primary"
            style={{
              width: '100%',
              fontSize: '0.9rem',
              padding: '0.6rem',
            }}
          >
            Finalizar Venta
          </button>
        </div>
      </div>
    </div>
  );
}
