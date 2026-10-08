import React from 'react';

interface ImageContainerProps {
  src: string;
  alt: string;
  caption?: string;
  maxHeight?: string;
  aspectRatio?: string;
  className?: string;
}

export const ImageContainer: React.FC<ImageContainerProps> = ({
  src,
  alt,
  caption,
  maxHeight = '380px',
  className = '',
}) => {
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
        }}
      >
        <img
          src={src}
          alt={alt}
          className="img-fluid"
          style={{
            maxHeight,
            objectFit: 'contain',
            width: '100%',
          }}
        />
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
