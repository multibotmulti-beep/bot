import React, { useRef, useState, useEffect } from 'react';

const CLOUD_NAME = 'bvhc9tnp';
const UPLOAD_PRESET = 'navegador';

interface ImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  existingImages?: string[];
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesUploaded,
  existingImages = [],
}) => {
  const [images, setImages] = useState<string[]>(existingImages);

  // Sincronizar si cambian las imágenes existentes (importante para edición)
  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await response.json();
    return data.secure_url;
  };

  const processImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Size for products
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject()),
          'image/jpeg',
          0.7
        );
      };
      img.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];

    for (const file of files) {
      try {
        const processedBlob = await processImage(file);
        const processedFile = new File([processedBlob], 'image.jpg', {
          type: 'image/jpeg',
        });
        const url = await uploadToCloudinary(processedFile);
        if (url) newUrls.push(url);
      } catch (err) {
        console.error('Error procesando imagen', err);
      }
    }

    const updatedImages = [...images, ...newUrls];
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img
              src={url}
              style={{
                width: '80px',
                height: '80px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                borderRadius: '50%',
                border: 'none',
                background: 'red',
                color: 'white',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-primary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
        >
          {uploading ? 'Subiendo...' : '+ Agregar Fotos'}
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
      />
    </div>
  );
};
