import React from 'react';
import { DeliveryRecord } from '../../types/delivery';

interface SlipViewerModalProps {
  delivery: DeliveryRecord | null;
  onClose: () => void;
}

export const SlipViewerModal: React.FC<SlipViewerModalProps> = ({
  delivery,
  onClose,
}) => {
  if (!delivery) return null;

  return (
    <div
      className="overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10001,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="tm-bg-white tm-bg-white-shadow"
        style={{
          maxWidth: '650px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="tm-bg-primary tm-sidebar-pad d-flex align-items-center justify-content-between"
          style={{ padding: '18px 24px' }}
        >
          <div>
            <h3
              className="tm-color-white tm-sidebar-title mb-0"
              style={{ fontSize: '1.4rem', fontWeight: 600 }}
            >
              Delivery Proof &bull; Receipt #{delivery.receiptNo}
            </h3>
            <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.85rem' }}>
              Recorded on {delivery.deliveryDate} at {delivery.uploadedTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.8rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="tm-pad" style={{ padding: '24px' }}>

          {/* Slip Image Display */}
          <div className="text-center mb-3">
            <span
              className="d-block text-uppercase text-muted mb-2 text-left"
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              MongoDB GridFS Stored Delivery Proof Slip:
            </span>
            <div
              style={{
                border: '1px solid #ddd',
                padding: '8px',
                background: '#fafafa',
              }}
            >
              <img
                src={delivery.slipImageUrl}
                alt={`Proof slip for Receipt #${delivery.receiptNo}`}
                className="img-fluid"
                style={{
                  maxHeight: '380px',
                  objectFit: 'contain',
                  width: '100%',
                }}
              />
            </div>
            <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem', textAlign: 'left' }}>
              <i className="fa fa-database mr-1 tm-color-primary"></i> Stored securely in MongoDB GridFS bucket (Receipt #{delivery.receiptNo})
            </p>
          </div>

          {/* Footer Action */}
          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ padding: '10px 25px' }}
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlipViewerModal;
