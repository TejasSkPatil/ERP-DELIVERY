import React, { useState, useEffect, useMemo } from 'react';

interface ImageContainerProps {
  src: string;
  alt: string;
  caption?: string;
  maxHeight?: string;
  aspectRatio?: string;
  className?: string;
  fallbackSrc?: string;
  fallbacks?: (string | null | undefined)[];
}

export const ImageContainer: React.FC<ImageContainerProps> = ({
  src,
  alt,
  caption,
  maxHeight = '380px',
  className = '',
  fallbackSrc,
  fallbacks = [],
}) => {
  // Build a distinct ordered list of candidate URLs
  const candidateList = useMemo(() => {
    const list = [src, ...fallbacks, fallbackSrc, '/img/img-01.jpg'].filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    );
    return Array.from(new Set(list));
  }, [src, fallbackSrc, fallbacks]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset index whenever candidate source or src prop changes
  useEffect(() => {
    setCurrentIndex(0);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const currentSrc = candidateList[currentIndex] || '/img/img-01.jpg';

  const handleError = () => {
    if (currentIndex + 1 < candidateList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div className={`tm-image-container ${className}`.trim()}>
      <div
        style={{
          border: '1px solid #ddd',
          padding: '8px',
          background: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          position: 'relative',
        }}
      >
        {isLoading && !hasError && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#888',
              fontSize: '0.85rem',
            }}
          >
            <i className="fa fa-spinner fa-spin mr-2"></i> Loading receipt slip...
          </div>
        )}

        <img
          src={currentSrc}
          alt={alt}
          className="img-fluid"
          style={{
            maxHeight,
            objectFit: 'contain',
            width: '100%',
            display: hasError ? 'none' : 'block',
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.2s ease',
          }}
          onError={handleError}
          onLoad={handleLoad}
          crossOrigin="anonymous"
        />

        {hasError && (
          <div className="text-center p-3 text-muted" style={{ fontSize: '0.85rem' }}>
            <i className="fa fa-file-image-o fa-2x mb-2 d-block text-secondary"></i>
            <span>Preview unavailable for this receipt slip.</span>
          </div>
        )}
      </div>
      {caption && (
        <p
          className="text-muted mt-2 mb-0"
          style={{ fontSize: '0.75rem', textAlign: 'left' }}
        >
          <i className="fa fa-info-circle mr-1 tm-color-primary"></i> {caption}
        </p>
      )}
    </div>
  );
};

export default ImageContainer;
