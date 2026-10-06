'use client';

import { useState, useEffect } from 'react';
import { useLoading } from '../loading/LoadingProvider';
import { auditLog } from '../../lib/auditLogger';
import { apiClient } from '../../lib/api';
import { ImageUploader } from './ImageUploader'; // Import the new component

export default function AddProductModal({
  onClose,
  onAdd,
  productToEdit,
  products, // Recibir desde props
}: {
  onClose: () => void;
  onAdd: (product: any) => void;
  productToEdit?: any;
  products: any[]; // Definir tipo
}) {
  const TECHNICAL_KEYS = [
    'images',
    'imagen',
    'img',
    'image',
    'is_offer',
    'offer',
    'discount_percent',
    'discount',
    'discountpercent',
  ];

  const [product, setProduct] = useState(() => {
    let images = productToEdit?.images || [];
    // Intentar recuperar imágenes de metadata si no están en la raíz
    if (images.length === 0 && productToEdit?.metadata?.images) {
      try {
        images = JSON.parse(productToEdit.metadata.images);
      } catch (e) {
        console.error('Error parsing images metadata', e);
      }
    }

    return {
      code: productToEdit?.code || '',
      name: productToEdit?.name || '',
      price: productToEdit?.price || '',
      qty: productToEdit?.qty || '',
      category: productToEdit?.category || '',
      images: images,
    };
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const { startLoading, stopLoading } = useLoading();

  // No necesitamos fetchAvailableProducts aquí ahora

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(product.category.toLowerCase())
  );

  const [learnedAttributes, setLearnedAttributes] = useState<
    { key: string; suggestions: string[] }[]
  >([]);
  const [activeSuggestField, setActiveSuggestField] = useState<{
    index: number;
    type: 'key' | 'value';
  } | null>(null);

  // Registro global de metadatos: todos los productos contribuyen a las sugerencias
  const globalMetadataRegistry: Record<string, Set<string>> = products.reduce(
    (acc, p) => {
      if (p.metadata && typeof p.metadata === 'object') {
        Object.entries(p.metadata as Record<string, any>).forEach(
          ([key, val]) => {
            // Filtrar claves técnicas internas usando la lista centralizada
            if (TECHNICAL_KEYS.includes(key.toLowerCase().trim())) return;

            if (!acc[key]) acc[key] = new Set();
            if (val) {
              const values = Array.isArray(val)
                ? val
                : String(val)
                    .split(',')
                    .map((v) => v.trim());
              values.forEach((v) => acc[key].add(String(v)));
            }
          }
        );
      }
      return acc;
    },
    {} as Record<string, Set<string>>
  );

  const allKnownKeys = Object.keys(globalMetadataRegistry);

  const getLearnedAttributes = (categoryName: string) => {
    if (!categoryName) return [];
    const catProducts = products.filter(
      (p) => p.category?.toLowerCase() === categoryName.toLowerCase()
    );

    const keyStats: Record<string, Set<string>> = {};

    catProducts.forEach((p) => {
      if (p.metadata && typeof p.metadata === 'object') {
        Object.entries(p.metadata).forEach(([key, val]) => {
          // Filtrar claves técnicas
          if (TECHNICAL_KEYS.includes(key.toLowerCase().trim())) return;

          if (!keyStats[key]) {
            keyStats[key] = new Set();
          }
          if (val) {
            keyStats[key].add(String(val));
          }
        });
      }
    });

    return Object.entries(keyStats).map(([key, valueSet]) => ({
      key,
      suggestions: Array.from(valueSet),
    }));
  };

  useEffect(() => {
    if (!product.category) return;

    const attrs = getLearnedAttributes(product.category);
    setLearnedAttributes(attrs);

    // ANCHOR METADATA: Fusionar valores actuales con la plantilla de la categoría
    setMetadata((prev) => {
      const newMetadata = [...prev];

      // Asegurar que existan todos los campos de la "plantilla" de la categoría
      attrs.forEach((attr) => {
        const exists = newMetadata.find(
          (m) => m.key.toLowerCase() === attr.key.toLowerCase()
        );
        if (!exists) {
          // Añadimos el campo de la plantilla si no está presente
          newMetadata.push({ key: attr.key, value: '' });
        }
      });
      return newMetadata;
    });
  }, [product.category, products]);

  const [metadata, setMetadata] = useState<{ key: string; value: string }[]>(
    () => {
      if (!productToEdit) return [];

      const rawMeta = productToEdit.metadata || {};

      // Solo metadatos de usuario (limpios usando la lista centralizada)
      return Object.entries(rawMeta)
        .filter(([key]) => !TECHNICAL_KEYS.includes(key.toLowerCase().trim()))
        .map(([key, value]) => ({
          key,
          value:
            typeof value === 'object' ? JSON.stringify(value) : String(value),
        }));
    }
  );

  const [technicalMetadata] = useState(() => {
    if (!productToEdit || !productToEdit.metadata)
      return { images: '[]', is_offer: 'false', discount_percent: '0' };
    const techObj: Record<string, any> = {
      images: '[]',
      is_offer: 'false',
      discount_percent: '0',
    };

    Object.entries(productToEdit.metadata).forEach(([key, value]) => {
      if (TECHNICAL_KEYS.includes(key.toLowerCase().trim())) {
        techObj[key] = value;
      }
    });
    return techObj;
  });

  // Renderizado de metadatos genéricos (YA NO FILTRAMOS AQUÍ)
  const renderMetadataFields = () => {
    return metadata.map((m, i) => {
      // Normalizar la clave para la búsqueda en el registro
      const normalizedKey = m.key.trim().toLowerCase();
      // Buscar en el registro normalizando también las claves del registro
      const keyFound = Object.keys(globalMetadataRegistry).find(
        (k) => k.toLowerCase() === normalizedKey
      );
      const valueSuggestions = keyFound
        ? Array.from(globalMetadataRegistry[keyFound] || [])
        : [];

      const keySuggestions = allKnownKeys.filter((k) =>
        k.toLowerCase().includes(normalizedKey)
      );

      const values = m.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      const removeValue = (valToRemove: string) => {
        const newVals = values.filter((v) => v !== valToRemove);
        handleMetadataChange(i, 'value', newVals.join(', '));
      };

      // Usamos m.key + i como key para estabilidad
      return (
        <div
          key={`${m.key}-${i}`}
          style={{ marginTop: '0.5rem', width: '100%' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '0.3rem', // Reducido para mayor compacidad
              width: '100%',
              marginBottom: '0.2rem',
            }}
          >
            <input
              placeholder="Campo"
              value={m.key}
              onChange={(e) => {
                handleMetadataChange(i, 'key', e.target.value);
                setActiveSuggestField({ index: i, type: 'key' });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.blur();
                }
              }}
              onFocus={() => setActiveSuggestField({ index: i, type: 'key' })}
              style={{
                flex: '1', // Igualdad de tamaño
                padding: '0.3rem', // Más compacto
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                boxSizing: 'border-box',
                fontSize: '0.8rem',
              }}
            />
            <input
              placeholder="Valor..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  const val = e.currentTarget.value.trim();
                  if (val) {
                    handleMetadataChange(
                      i,
                      'value',
                      [...values, val].join(', ')
                    );
                    e.currentTarget.value = '';
                  }
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                const val = e.currentTarget.value.trim();
                if (val) {
                  handleMetadataChange(i, 'value', [...values, val].join(', '));
                  e.currentTarget.value = '';
                }
              }}
              onFocus={() => setActiveSuggestField({ index: i, type: 'value' })}
              style={{
                flex: '1', // Igualdad de tamaño
                padding: '0.3rem', // Más compacto
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                boxSizing: 'border-box',
                fontSize: '0.8rem',
              }}
            />
          </div>

          {/* Sugerencias de clave */}
          {activeSuggestField?.index === i &&
            activeSuggestField.type === 'key' &&
            keySuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  zIndex: 100,
                  maxHeight: '100px',
                  overflowY: 'auto',
                  width: '45%',
                }}
              >
                {keySuggestions.map((s) => (
                  <div
                    key={s as string}
                    onClick={() => {
                      handleMetadataChange(i, 'key', s as string);
                      setActiveSuggestField(null);
                    }}
                    style={{ padding: '0.5rem', cursor: 'pointer' }}
                  >
                    {s as string}
                  </div>
                ))}
              </div>
            )}

          {/* Sugerencias de valor */}
          {activeSuggestField?.index === i &&
            activeSuggestField.type === 'value' &&
            valueSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  zIndex: 100,
                  maxHeight: '100px',
                  overflowY: 'auto',
                  width: '45%',
                  right: 0,
                }}
              >
                {valueSuggestions.map((s) => (
                  <div
                    key={s as string}
                    onClick={() => {
                      handleMetadataChange(
                        i,
                        'value',
                        [...values, s as string].join(', ')
                      );
                      setActiveSuggestField(null);
                    }}
                    style={{ padding: '0.5rem', cursor: 'pointer' }}
                  >
                    {s as string}
                  </div>
                ))}
              </div>
            )}

          {/* Tags debajo */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.3rem',
              marginTop: '0.4rem',
            }}
          >
            {values.map((val, vIndex) => (
              <span
                key={vIndex}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {val}
                <button
                  type="button"
                  onClick={() => removeValue(val)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      );
    });
  };

  const addMetadataField = () =>
    setMetadata([...metadata, { key: '', value: '' }]);

  const handleMetadataChange = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newMetadata = [...metadata];
    newMetadata[index][field] = value;
    setMetadata(newMetadata);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !product.code ||
      !product.name ||
      !product.price ||
      !product.qty ||
      !product.category
    ) {
      auditLog('Error: Campos obligatorios faltantes', 'error');
      return;
    }

    startLoading();

    // 1. Construir objeto usuario (limpio)
    const userMeta = metadata.reduce(
      (acc, curr) => {
        if (curr.key) acc[curr.key] = curr.value;
        return acc;
      },
      {} as Record<string, string>
    );

    // 2. Fusionar: usuario primero, técnicos al final
    const finalMetadata = {
      ...userMeta,
      ...technicalMetadata, // Conserva los valores originales si no fueron tocados
      images: JSON.stringify(product.images), // Actualiza imágenes
    };

    const productPayload = {
      ...product,
      metadata: finalMetadata,
      price: Number(product.price),
      qty: Number(product.qty),
    };

    // Guardar el producto
    await onAdd(productPayload);
    stopLoading();
    onClose();
  };

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
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
          width: '100%',
          maxWidth: '500px',
          margin: '0',
          position: 'relative',
          boxShadow:
            '0 0 20px 5px rgba(var(--color-primary-rgb, 37, 99, 235), 0.3)',
          border: '1px solid var(--color-border)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {productToEdit ? 'Editar Producto' : 'Añadir Producto'}
        </div>

        {/* Espaciado superior para compensar el título absoluto */}
        <div style={{ marginTop: '1rem' }}></div>

        <div
          style={{
            padding: '0.5rem',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <ImageUploader
            existingImages={product.images}
            onImagesUploaded={(urls) =>
              setProduct({ ...product, images: urls })
            }
          />
        </div>

        {/* Código con generador */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Código"
            value={product.code}
            onChange={(e) => setProduct({ ...product, code: e.target.value })}
            disabled={!!productToEdit}
            required
            style={{
              flex: '1 1 200px',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
            }}
          />
          {!productToEdit && (
            <button
              type="button"
              onClick={() => {
                setProduct({
                  ...product,
                  code: Math.random()
                    .toString(36)
                    .substring(2, 10)
                    .toUpperCase(),
                });
              }}
              className="btn-primary"
              style={{ padding: '0.5rem var(--space-sm)' }}
            >
              Generar
            </button>
          )}
        </div>

        <input
          placeholder="Nombre"
          value={product.name}
          onChange={(e) => {
            setProduct({ ...product, name: e.target.value });
          }}
          required
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            boxSizing: 'border-box',
          }}
        />

        {/* Agrupación de precio y cantidad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <input
            type="number"
            placeholder="Precio"
            value={product.price}
            onChange={(e) => {
              setProduct({ ...product, price: e.target.value });
            }}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={product.qty}
            onChange={(e) => {
              setProduct({ ...product, qty: e.target.value });
            }}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <input
            placeholder="Categoría"
            value={product.category}
            onChange={(e) => {
              setProduct({ ...product, category: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              boxSizing: 'border-box',
            }}
          />
          {showSuggestions && filteredCategories.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-card)',
                marginTop: '4px',
              }}
            >
              {filteredCategories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    setProduct({ ...product, category: cat });
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    fontSize: '0.85rem',
                  }}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contenedor scrollable para metadatos (máx 3 visibles) */}
        <div
          style={{
            maxHeight: '160px',
            overflowY: 'auto',
            border: '1px solid #eee',
            padding: '0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {renderMetadataFields()}
        </div>

        <button
          type="button"
          onClick={addMetadataField}
          className="btn-secondary"
        >
          + Añadir Campo
        </button>
        <button type="submit" className="btn-primary">
          {productToEdit ? 'Actualizar' : 'Guardar'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
      </form>
    </div>
  );
}
