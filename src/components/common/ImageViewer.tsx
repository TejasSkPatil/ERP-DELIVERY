import React from 'react';
import { DeliveryRecord } from '../../types/delivery';
import { Modal, Button, ImageContainer } from '../ui';

interface ImageViewerProps {
  delivery: DeliveryRecord | null;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ delivery, onClose }) => {
  if (!delivery) return null;

  return (
    <Modal
      isOpen={Boolean(delivery)}
      onClose={onClose}
      title={`Delivery Proof \u2022 Receipt #${delivery.receiptNo}`}
      subtitle={`Recorded on ${delivery.deliveryDate} at ${delivery.uploadedTime}`}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close Viewer
        </Button>
      }
    >
      {/* Metadata Row */}
      <div
        className="row mb-3"
        style={{
          background: '#F4F4F4',
          margin: '0 0 20px 0',
          padding: '12px 15px',
          borderLeft: '4px solid #ee5057',
        }}
      >
        <div className="col-sm-6 mb-2 mb-sm-0">
          <span className="text-uppercase text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Delivery Person:
          </span>
          <div style={{ fontWeight: 600, color: '#1f3646' }}>
            <i className="fa fa-user mr-1 tm-color-primary"></i> {delivery.deliveryPerson}
          </div>
        </div>
        <div className="col-sm-6">
          <span className="text-uppercase text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
            Customer / Order:
          </span>
          <div style={{ fontWeight: 600, color: '#1f3646' }}>
            <i className="fa fa-tag mr-1 tm-color-primary"></i> {delivery.customer}
          </div>
        </div>
      </div>

      {/* Slip Image Container */}
      <div className="mb-2">
        <span
          className="d-block text-uppercase text-muted mb-2 text-left"
          style={{ fontSize: '0.75rem', fontWeight: 600 }}
        >
          Single-Source MongoDB GridFS Proof Slip:
        </span>
        <ImageContainer
          src={delivery.slipImageUrl}
          alt={`Proof slip for Receipt #${delivery.receiptNo}`}
          caption={`Stored natively in MongoDB GridFS bucket \u2022 Receipt #${delivery.receiptNo}`}
        />
      </div>
    </Modal>
  );
};

export default ImageViewer;
