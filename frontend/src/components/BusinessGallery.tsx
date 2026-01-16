import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface BusinessGalleryProps {
  images: string[];
  businessName: string;
}

export const BusinessGallery: React.FC<BusinessGalleryProps> = ({ images, businessName }) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  
  // Get API base URL for image URLs
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  // Helper to get full image URL
  const getImageUrl = (image: string) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    // Remove leading slash if present to avoid double slashes
    const cleanPath = image.startsWith('/') ? image : `/${image}`;
    return `${API_BASE_URL}${cleanPath}`;
  };

  if (!images || images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Photo Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group"
              onClick={() => openLightbox(index)}
            >
              <img
                src={getImageUrl(image)}
                alt={`${businessName} - Photo ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Failed to load image: ${getImageUrl(image)}`);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div
            className="max-w-7xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(images[selectedImage])}
              alt={`${businessName} - Photo ${selectedImage + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
              onError={(e) => {
                console.error(`Failed to load image in lightbox: ${getImageUrl(images[selectedImage])}`);
                e.currentTarget.style.display = 'none';
              }}
            />
            {images.length > 1 && (
              <div className="text-white text-center mt-4">
                {selectedImage + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

