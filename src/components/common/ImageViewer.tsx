import React from 'react';
import { DeliveryRecord } from '../../types/delivery';
import { Modal, Button, ImageContainer } from '../ui';
import { formatDisplayDate } from '../../utils/timeZone';
import { getCachedSlipImage } from '../../utils/slipImageCache';
import { getApiBaseUrl } from '../../services/api';

interface ImageViewerProps {
  delivery: DeliveryRecord | null;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ delivery, onClose }) => {
  if (!delivery) return null;

  const cachedSlip =
    getCachedSlipImage(delivery.receiptNo) ||
    getCachedSlipImage(delivery.slipFileId) ||
    getCachedSlipImage(delivery.id);

  const base = getApiBaseUrl();
  const directGridFsUrl = delivery.slipFileId
    ? `${base}/delivery/slip/${delivery.slipFileId}`
    : undefined;
  const relativeGridFsUrl = delivery.slipFileId
    ? `/api/delivery/slip/${delivery.slipFileId}`
    : undefined;

  // Use freshly uploaded preview/cached slip if available, or direct GridFS stream
  const primarySrc =
    cachedSlip || delivery.slipImageUrl || directGridFsUrl || '/img/img-01.jpg';

  const fallbacks = [
    cachedSlip,
    delivery.slipImageUrl,
    directGridFsUrl,
    relativeGridFsUrl,
    '/img/img-01.jpg',
  ];

  return (
    <Modal
      isOpen={Boolean(delivery)}
      onClose={onClose}
      title={`Delivery Proof \u2022 Receipt #${delivery.receiptNo}`}
      subtitle={`Recorded on ${formatDisplayDate(delivery.receiptDate || delivery.deliveryDate)} at ${delivery.uploadedTime}`}
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
          src={primarySrc}
          fallbacks={fallbacks}
          alt={`Proof slip for Receipt #${delivery.receiptNo}`}
          caption={`Stored natively in MongoDB GridFS bucket \u2022 Receipt #${delivery.receiptNo}`}
        />
      </div>
    </Modal>
  );
};

export default ImageViewer;
