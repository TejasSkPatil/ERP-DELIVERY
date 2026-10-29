import React, { useState, useRef } from 'react';
import { DeliveryRecord, NewDeliveryInput } from '../../types/delivery';
import { deliveryService } from '../../services/deliveryService';
import { Alert, Button, Badge } from '../ui';
import { formatDisplayDate } from '../../utils/timeZone';
import { cacheSlipImage } from '../../utils/slipImageCache';

interface DeliveryFormProps {
  onCompleteDelivery?: (input: NewDeliveryInput) => Promise<DeliveryRecord>;
  onDeliveryCreated?: (record: DeliveryRecord) => void;
  todayCount: number;
}

type SubmissionState = 'idle' | 'uploading' | 'processing_ocr' | 'success' | 'error';

export const DeliveryForm: React.FC<DeliveryFormProps> = ({
  onCompleteDelivery,
  onDeliveryCreated,
  todayCount,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [completedRecord, setCompletedRecord] = useState<DeliveryRecord | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPG, PNG).');
        setSubmissionState('error');
        return;
      }
      setErrorMessage(null);
      setSubmissionState('idle');
      setImageFile(file);
      setImageFileName(file.name);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Read as base64 DataURL for persistent caching
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageDataUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageDataUrl(null);
    setImageFileName('');
    setErrorMessage(null);
    setSubmissionState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!imageFile && !imagePreview) {
      setErrorMessage('Please select or capture a receipt image to upload.');
      setSubmissionState('error');
      return;
    }

    setErrorMessage(null);
    setSubmissionState('uploading');

    // Transition smoothly to OCR processing state after brief upload initiation
    const timer = setTimeout(() => {
      setSubmissionState('processing_ocr');
    }, 700);

    try {
      const effectivePreview = imageDataUrl || imagePreview;
      let record: DeliveryRecord;
      if (onCompleteDelivery) {
        record = await onCompleteDelivery({
          slipFile: imageFile,
          slipPreviewUrl: effectivePreview || undefined,
        });
      } else {
        record = await deliveryService.createDelivery({
          slipFile: imageFile,
          slipPreviewUrl: effectivePreview || undefined,
        });
      }

      if (effectivePreview) {
        cacheSlipImage(record.receiptNo, effectivePreview);
        if (record.slipFileId) cacheSlipImage(record.slipFileId, effectivePreview);
        cacheSlipImage(record.id, effectivePreview);
      }

      if (onDeliveryCreated) {
        onDeliveryCreated(record);
      }

      clearTimeout(timer);
      setCompletedRecord(record);
      setSubmissionState('success');

      // Clear the file input for the next receipt
      setImageFile(null);
      setImagePreview(null);
      setImageDataUrl(null);
      setImageFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      clearTimeout(timer);
      setSubmissionState('error');
      if (err?.code === 'COLLECTION_REJECTED' || (err?.message && /COLLECTION/i.test(err.message))) {
        setErrorMessage("'COLLECTION' slips :Invalid slip");
      } else {
        setErrorMessage(err?.message || 'Failed to scan and save receipt. Please try again.');
      }
    }
  };

  const isSubmitting = submissionState === 'uploading' || submissionState === 'processing_ocr';

  return (
    <div className="tm-section tm-bg-img" id="tm-section-1" style={{ height: 'auto', padding: '50px 15px' }}>
      <div className="tm-bg-white ie-container-width-fix-2" style={{ maxWidth: '780px', width: '100%', margin: '0 auto', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}>
        <div className="container ie-h-align-center-fix">
          <div className="row">
            <div className="col-12 ml-auto mr-auto ie-container-width-fix p-0">
              {/* Header inside White Card */}
              <div
                className="tm-bg-primary tm-sidebar-pad d-flex flex-wrap justify-content-between align-items-center"
                style={{ padding: '16px 28px', backgroundColor: '#ee5057' }}
              >
                <div>
                  <h3 className="tm-color-white tm-sidebar-title mb-0" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    <i className="fa fa-motorcycle mr-2"></i> Pizza Delivery Proof Entry
                  </h3>
                  <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                    Single slip upload &bull; Automatic receipt number, date &amp; time OCR extraction
                  </p>
                </div>
                <Badge variant="navy">Delivery Boy Total: {todayCount} Deliveries</Badge>
              </div>

              {/* Success Message Banner */}
              {completedRecord && submissionState === 'success' && (
                <div style={{ margin: '20px 28px 0 28px' }}>
                  <Alert
                    type="success"
                    onDismiss={() => {
                      setCompletedRecord(null);
                      setSubmissionState('idle');
                    }}
                    title="Receipt Scanned & Recorded Successfully!"
                  >
                    <div className="d-flex flex-wrap align-items-center mt-1" style={{ gap: '15px' }}>
                      <span>
                        <strong>Receipt No:</strong> <span className="badge badge-danger" style={{ backgroundColor: '#ee5057', fontSize: '0.85rem' }}>#{completedRecord.receiptNo}</span>
                      </span>
                      <span>
                        <strong>Receipt Date:</strong> <code>{formatDisplayDate(completedRecord.receiptDate || completedRecord.deliveryDate)}</code>
                      </span>
                      <span>
                        <strong>Receipt Time:</strong> <code>{completedRecord.receiptTime || 'Extracted'}</code>
                      </span>
                      <span>
                        <strong>Delivery Type:</strong> <span className="badge badge-success" style={{ backgroundColor: '#10B981', fontSize: '0.85rem' }}>{completedRecord.orderType || 'DELIVERY'}</span>
                      </span>
                    </div>
                  </Alert>
                </div>
              )}

              {/* OCR Processing State Indicator */}
              {isSubmitting && (
                <div style={{ margin: '20px 28px 0 28px' }}>
                  <div
                    style={{
                      padding: '14px 20px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderLeft: '5px solid #3B82F6',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <i className="fa fa-spinner fa-spin fa-lg text-primary" style={{ color: '#2563EB' }}></i>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1E3A8A', fontSize: '0.95rem' }}>
                        {submissionState === 'uploading'
                          ? 'Uploading receipt slip to secure GridFS storage...'
                          : 'Processing OCR — Scanning receipt number, date & time...'}
                      </div>
                      <small style={{ color: '#4B5563' }}>
                        Tesseract OCR engine is reading receipt fields. Please do not close or reload this page.
                      </small>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message Banner */}
              {errorMessage && (
                <div style={{ margin: '20px 28px 0 28px' }}>
                  <Alert type="danger">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Scan Failed: </strong>
                        {errorMessage}
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon="fa-refresh"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting || !imageFile}
                        style={{ marginLeft: '12px', whiteSpace: 'nowrap' }}
                      >
                        Retry Scan
                      </Button>
                    </div>
                  </Alert>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="tm-search-form tm-section-pad-2" style={{ padding: '22px 28px' }}>
                {/* Single Receipt-Image Upload / Camera-Capture Area */}
                <div className="mb-3">
                  <label
                    className="text-uppercase text-muted font-weight-bold d-block"
                    style={{ fontSize: '0.75rem', marginBottom: '8px', letterSpacing: '0.5px' }}
                  >
                    Delivery Proof Receipt Slip <span className="text-danger">*</span>
                  </label>

                  {!imagePreview ? (
                    <div
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #ee5057',
                        backgroundColor: '#FFF9F9',
                        padding: '30px 20px',
                        textAlign: 'center',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF0F1')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFF9F9')}
                    >
                      <i className="fa fa-camera fa-2x tm-color-primary mb-2" style={{ color: '#ee5057' }}></i>
                      <div
                        className="text-uppercase tm-font-semibold"
                        style={{ fontSize: '0.95rem', color: '#1f3646', fontWeight: 600 }}
                      >
                        Tap to Capture or Select Slip Image
                      </div>
                      <small className="text-muted d-block mt-1">
                        High-clarity photo recommended for automatic Receipt No, Date &amp; Time reading
                      </small>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Supports JPG, PNG &bull; Direct GridFS storage &bull; 32-day retention
                      </small>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderLeft: '4px solid #ee5057',
                        borderRadius: '4px',
                        padding: '16px',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f3646' }}>
                          <i className="fa fa-check-circle mr-1" style={{ color: '#10B981' }}></i>
                          Selected: {imageFileName || 'Receipt Slip'}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon="fa-camera"
                          onClick={handleRemoveImage}
                          disabled={isSubmitting}
                        >
                          Change Slip
                        </Button>
                      </div>
                      <div className="text-center" style={{ maxHeight: '240px', overflow: 'hidden', backgroundColor: '#F3F4F6', borderRadius: '4px', padding: '6px' }}>
                        <img
                          src={imagePreview}
                          alt="Slip Preview"
                          style={{
                            maxHeight: '220px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <div className="mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={isSubmitting ? 'fa-spinner fa-spin' : 'fa-qrcode'}
                    disabled={isSubmitting || (!imageFile && !imagePreview)}
                    style={{
                      width: '100%',
                      height: '52px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      backgroundColor: isSubmitting ? '#d94148' : '#ee5057',
                      borderColor: '#ee5057',
                    }}
                  >
                    {isSubmitting
                      ? (submissionState === 'uploading' ? 'Uploading Slip...' : 'Scanning Receipt via OCR...')
                      : 'Upload & Scan Receipt'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
