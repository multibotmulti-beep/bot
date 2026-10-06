import React, { useState } from 'react';
import AddProductModal from './AddProductModal';
import { useLoading } from '../loading/LoadingProvider';
import { apiClient } from '../../lib/api';
import { ProductCard } from '../store/ProductCard';

export default function OfferWizardModal({
  onClose,
  products,
  onSave,
}: {
  onClose: () => void;
  products: any[];
  onSave: () => void;
}) {
  const [step, setStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<any[]>(() =>
    products.filter((p) => p.metadata?.is_offer === 'true')
  );
  const [initialOffers] = useState<any[]>(() =>
    products.filter((p) => p.metadata?.is_offer === 'true')
  );
  const [activeProductCode, setActiveProductCode] = useState<string | null>(
    products.filter((p) => p.metadata?.is_offer === 'true').length > 0
      ? products.filter((p) => p.metadata?.is_offer === 'true')[0].code
      : null
  );
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const { startLoading, stopLoading } = useLoading();
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  const [offerConfigs, setOfferConfigs] = useState<
    Record<string, { discountPercent: string }>
  >(() => {
    const configs: Record<string, { discountPercent: string }> = {};
    products
      .filter((p) => p.metadata?.is_offer === 'true')
      .forEach((p) => {
        configs[p.code] = {
          discountPercent: p.metadata?.discount_percent || '10',
        };
      });
    return configs;
  });

  // Efecto para la rotación automática en el Paso 3
  React.useEffect(() => {
    if (step === 3 && selectedProducts.length > 0) {
      const timer = setInterval(() => {
        setCurrentOfferIndex((prev) => (prev + 1) % selectedProducts.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [step, selectedProducts.length]);

  const toggleProduct = (product: any) => {
    let metadataObj = {};
    if (typeof product.metadata === 'string') {
      try {
        metadataObj = JSON.parse(product.metadata);
      } catch (e) {
        console.error(e);
      }
    } else if (
      typeof product.metadata === 'object' &&
      product.metadata !== null
    ) {
      metadataObj = product.metadata;
    }

    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.code === product.code);
      if (exists) {
        const newConfigs = { ...offerConfigs };
        delete newConfigs[product.code];
        setOfferConfigs(newConfigs);
        if (activeProductCode === product.code) setActiveProductCode(null);
        return prev.filter((p) => p.code !== product.code);
      } else {
        const newConfig = { discountPercent: '10' };
        setOfferConfigs((prev) => ({ ...prev, [product.code]: newConfig }));
        if (!activeProductCode) setActiveProductCode(product.code);
        return [
          ...prev,
          {
            ...product,
            images: product.images, // Asegurar que preservamos la raíz de imágenes
            metadata: {
              ...metadataObj,
              is_offer: 'true',
              discount_percent: newConfig.discountPercent,
            },
          },
        ];
      }
    });
  };

  const updateDiscount = (discount: string) => {
    if (!activeProductCode) return;
    setOfferConfigs((prev) => ({
      ...prev,
      [activeProductCode]: { discountPercent: discount },
    }));

    // Actualizar producto para preview
    setSelectedProducts((prev) =>
      prev.map((p) => {
        let metadataObj = {};
        if (typeof p.metadata === 'string') {
          try {
            metadataObj = JSON.parse(p.metadata);
          } catch (e) {
            console.error(e);
          }
        } else if (typeof p.metadata === 'object' && p.metadata !== null) {
          metadataObj = p.metadata;
        }

        return p.code === activeProductCode
          ? {
              ...p,
              metadata: {
                ...metadataObj,
                is_offer: 'true',
                discount_percent: discount,
              },
            }
          : p;
      })
    );
  };

  const handleSaveAllOffers = async () => {
    startLoading();
    try {
      // 1. Procesar productos seleccionados (añadir/editar ofertas)
      for (const product of selectedProducts) {
        const config = offerConfigs[product.code];

        let metadataObj = {};
        if (typeof product.metadata === 'string') {
          try {
            metadataObj = JSON.parse(product.metadata);
          } catch (e) {
            console.error(e);
          }
        } else if (
          typeof product.metadata === 'object' &&
          product.metadata !== null
        ) {
          metadataObj = product.metadata;
        }

        const newMetadata = {
          ...metadataObj,
          is_offer: 'true',
          discount_percent: config.discountPercent,
        };

        await apiClient('/execute', {
          method: 'POST',
          body: JSON.stringify({
            cmd: 'stock.update',
            params: {
              code: product.code,
              ...product,
              metadata: newMetadata,
            },
          }),
        });
      }

      // 2. Procesar productos que eran ofertas y fueron desmarcados (eliminar ofertas)
      for (const initialProduct of initialOffers) {
        if (!selectedProducts.find((p) => p.code === initialProduct.code)) {
          let metadataObj = {};
          if (typeof initialProduct.metadata === 'string') {
            try {
              metadataObj = JSON.parse(initialProduct.metadata);
            } catch (e) {
              console.error(e);
            }
          } else if (
            typeof initialProduct.metadata === 'object' &&
            initialProduct.metadata !== null
          ) {
            metadataObj = initialProduct.metadata;
          }

          const newMetadata = {
            ...metadataObj,
            is_offer: 'false',
            discount_percent: '0',
          };
          await apiClient('/execute', {
            method: 'POST',
            body: JSON.stringify({
              cmd: 'stock.update',
              params: {
                code: initialProduct.code,
                ...initialProduct,
                metadata: newMetadata,
              },
            }),
          });
        }
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving offers', error);
    } finally {
      stopLoading();
    }
  };

  const activeProduct = selectedProducts.find(
    (p) => p.code === activeProductCode
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          width: 'auto',
          minWidth: '350px',
          maxWidth: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
      >
        {step === 1 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              maxWidth: '300px',
              margin: '0 auto',
            }}
          >
            <h2>Seleccionar Productos</h2>
            <button
              onClick={() => setIsNewProductModalOpen(true)}
              className="btn-secondary"
            >
              + Crear Producto Nuevo
            </button>
            <div
              style={{
                marginTop: '1rem',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
              }}
            >
              {products.map((p) => {
                const isSelected = selectedProducts.find(
                  (s) => s.code === p.code
                );
                return (
                  <div
                    key={p.code}
                    onClick={() => toggleProduct(p)}
                    style={{
                      padding: '0.6rem',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isSelected
                        ? 'var(--color-primary-light)'
                        : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {p.name}
                    {isSelected && <span>✓</span>}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={selectedProducts.length === 0}
              className="btn-primary"
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2>Paso 2: Configurar Ofertas</h2>
            <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                {selectedProducts.map((p) => (
                  <div
                    key={p.code}
                    onClick={() => setActiveProductCode(p.code)}
                    style={{
                      padding: '0.5rem',
                      border:
                        activeProductCode === p.code
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
              <div style={{ flex: 2 }}>
                {activeProduct ? (
                  <div style={{ maxWidth: '250px', margin: '0 auto' }}>
                    <ProductCard
                      product={activeProduct}
                      toggleExpand={() => {}}
                      expanded={false}
                      addToCart={() => {}}
                      editable={true}
                      onDiscountChange={(val) => updateDiscount(val)}
                    />
                  </div>
                ) : (
                  <p>Selecciona un producto para configurar</p>
                )}
              </div>
            </div>
            <button onClick={() => setStep(1)} className="btn-secondary">
              Atrás
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Siguiente
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2>Paso 3: Previsualización</h2>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
              }}
            >
              {selectedProducts.map((p, index) => (
                <div
                  key={p.code}
                  style={{
                    transition: 'opacity 0.5s ease-in-out',
                    opacity: currentOfferIndex === index ? 1 : 0,
                    position:
                      currentOfferIndex === index ? 'relative' : 'absolute',
                    width: '250px',
                  }}
                >
                  <ProductCard
                    product={p}
                    toggleExpand={() => {}}
                    expanded={false}
                    addToCart={() => {}}
                  />
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-secondary">
              Atrás
            </button>
            <button onClick={handleSaveAllOffers} className="btn-primary">
              Finalizar y Guardar
            </button>
          </div>
        )}
      </div>

      {isNewProductModalOpen && (
        <AddProductModal
          onClose={() => setIsNewProductModalOpen(false)}
          onAdd={() => {}}
          products={products}
        />
      )}
    </div>
  );
}
