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

      {/* Slip Image Container */}
      <div className="mb-2">
        <span
          className="d-block text-uppercase text-muted mb-2 text-left"
          style={{ fontSize: '0.75rem', fontWeight: 600 }}
        >
          Single-Source MongoDB GridFS Proof Slip:
        </span>
        <ImageContainer
          src={delivery.slipImageUrl || '/img/img-01.jpg'}
          alt={`Proof slip for Receipt #${delivery.receiptNo}`}
          caption={`Stored natively in MongoDB GridFS bucket \u2022 Receipt #${delivery.receiptNo}`}
        />
      </div>
    </Modal>
  );
};

export default ImageViewer;
