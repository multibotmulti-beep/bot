'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { LocalStorageSync } from '../../lib/localStorageSync'; // Importar servicio
import StockCard from './StockCard';
import AddProductModal from './AddProductModal';
import OfferWizardModal from './OfferWizardModal';
import { useLoading } from '../loading/LoadingProvider';
import SearchBar from '../sales/SearchBar';
import { useTour } from '../tour/TourProvider';
import { searchProducts } from '../../lib/searchUtils';

const STOCK_STORAGE_KEY = 'stock_data';

export default function StockPanel() {
  const [products, setProducts] = useState(
    () => LocalStorageSync.getData(STOCK_STORAGE_KEY) || []
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<any | null>(null);
  const { startLoading, stopLoading } = useLoading();
  const { triggerEvent } = useTour();

  useEffect(() => {
    fetchStock();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'BARCODE_SCANNED') {
          const code = data.code.trim(); // Limpiar espacios
          const existingProduct = products.find(
            (p: any) => p.code.toLowerCase() === code.toLowerCase()
          );

          if (existingProduct) {
            setScannedCode(existingProduct);
            setIsModalOpen(true); // Abrir modal en modo edición
          } else {
            setScannedCode({ code });
            setIsModalOpen(true); // Abrir modal en modo añadir
          }
        }
      } catch (e) {
        console.error('Error parsing message from RN:', e);
      }
    };

    window.addEventListener('message', handleMessage);
    // Para entornos WebView
    (window as any).document.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      (window as any).document.removeEventListener('message', handleMessage);
    };
  }, []);

  const fetchStock = async () => {
    // No usamos startLoading() aquí para permitir carga silenciosa
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.list', params: {} }),
      });
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
        LocalStorageSync.saveData(STOCK_STORAGE_KEY, result.data); // Persistir
      }
    } catch (error) {
      console.error('Error fetching stock:', error);
    }
  };

  const handleUpdate = async (product: any) => {
    startLoading();
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({
          cmd: 'stock.update',
          params: {
            code: product.code,
            ...product,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el producto');
      }

      await fetchStock();
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      alert('No se pudo actualizar el producto. Por favor, intenta de nuevo.');
    } finally {
      stopLoading();
    }
  };

  const handleDelete = async (code: string) => {
    startLoading();
    try {
      const response = await apiClient('/execute', {
        method: 'POST',
        body: JSON.stringify({ cmd: 'stock.delete', params: { code } }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error detallado del backend (Delete):', errorData);
        alert(`Error al eliminar: ${errorData.message || 'Error desconocido'}`);
      } else {
        await fetchStock();
      }
    } catch (error) {
      console.error('Error de red en handleDelete:', error);
    }
    stopLoading();
  };

  const handleAdd = async (product: any) => {
    await apiClient('/execute', {
      method: 'POST',
      body: JSON.stringify({ cmd: 'stock.add', params: product }),
    });
    triggerEvent('product_saved');
    fetchStock();
    setIsModalOpen(false);
  };

  const filteredProducts = searchProducts(products || [], searchTerm);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh', // Usar dvh para móviles
        paddingBottom: '80px',
        overflow: 'hidden', // Contenedor padre no debe scrollear
      }}
    >
      {/* Buscador Fijo */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 10,
          backgroundColor: 'var(--color-background)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-sm)',
          boxSizing: 'border-box',
          width: '100%',
          height: '60px', // Altura definida para el buscador
        }}
      >
        <SearchBar onSearch={setSearchTerm} products={products} />
      </div>

      {/* Grid de tarjetas scrolleable */}
      <div
        className="stock-grid"
        style={{
          flex: 1,
          marginTop: '60px', // Padding para compensar el buscador fijo
          overflowY: 'auto',
          padding: 'var(--space-sm)',
          zIndex: 1,
        }}
      >
        {Array.isArray(filteredProducts) &&
          filteredProducts.map((p: any, index: number) => (
            <StockCard
              key={`${p.code}-${index}`}
              product={p}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              products={products}
            />
          ))}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '85px',
          right: '1.5rem',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          zIndex: 20,
        }}
      >
        +
      </button>

      {/* Botón de Ofertas */}
      <button
        onClick={() => setIsOfferModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '145px',
          right: '1.5rem',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-secondary)',
          color: 'white',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </button>

      {isOfferModalOpen && (
        <OfferWizardModal
          onClose={() => setIsOfferModalOpen(false)}
          products={products}
          onSave={() => {
            fetchStock();
            setIsOfferModalOpen(false);
          }}
        />
      )}

      {isModalOpen && (
        <AddProductModal
          onClose={() => {
            setIsModalOpen(false);
            setScannedCode(null);
          }}
          onAdd={handleAdd}
          products={products}
          productToEdit={
            scannedCode && typeof scannedCode === 'object'
              ? scannedCode
              : scannedCode
                ? { code: scannedCode }
                : undefined
          }
        />
      )}
    </div>
  );
}
