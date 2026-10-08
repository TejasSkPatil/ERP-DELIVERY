import React, { useState, useRef } from 'react';
import { DeliveryRecord, NewDeliveryInput } from '../../types/delivery';
import { FormElement, FormInput, Alert, Button, Badge } from '../ui';

interface DeliveryFormProps {
  onCompleteDelivery: (input: NewDeliveryInput) => Promise<DeliveryRecord>;
  todayCount: number;
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({
  onCompleteDelivery,
  todayCount,
}) => {
  const [receiptNo, setReceiptNo] = useState('');
  const [customer, setCustomer] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [completedRecord, setCompletedRecord] = useState<DeliveryRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG).');
        return;
      }
      setError(null);
      setImageFile(file);
      setImageFileName(file.name);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptNo.trim()) {
      setError('Receipt Number is required.');
      return;
    }

    if (!customer.trim()) {
      setError('Customer name or order details are required.');
      return;
    }

    if (!imageFile && !imagePreview) {
      setError('Delivery proof slip image is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const record = await onCompleteDelivery({
        receiptNo: receiptNo.trim(),
        customer: customer.trim(),
        slipFile: imageFile,
        slipPreviewUrl: imagePreview || undefined,
      });

      setCompletedRecord(record);
      setReceiptNo('');
      setCustomer('');
      setImageFile(null);
      setImagePreview(null);
      setImageFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit delivery proof');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tm-section tm-bg-img" id="tm-section-1" style={{ height: 'auto', padding: '60px 15px' }}>
      <div className="tm-bg-white ie-container-width-fix-2" style={{ maxWidth: '850px', width: '100%', margin: '0 auto' }}>
        <div className="container ie-h-align-center-fix">
          <div className="row">
            <div className="col-12 ml-auto mr-auto ie-container-width-fix p-0">
              {/* Header inside White Card */}
              <div
                className="tm-bg-primary tm-sidebar-pad d-flex flex-wrap justify-content-between align-items-center"
                style={{ padding: '18px 30px' }}
              >
                <div>
                  <h3 className="tm-color-white tm-sidebar-title mb-0" style={{ fontSize: '1.3rem' }}>
                    <i className="fa fa-motorcycle mr-2"></i> Pizza Delivery Proof Entry
                  </h3>
                  <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.8rem' }}>
                    Enter receipt number &amp; attach single slip image &bull; Auto-stamped in Asia/Kolkata
                  </p>
                </div>
                <Badge variant="navy">Shift Total: {todayCount} Deliveries</Badge>
              </div>

              {/* Success Message Banner */}
              {completedRecord && (
                <div style={{ margin: '20px 30px 0 30px' }}>
                  <Alert
                    type="success"
                    onDismiss={() => setCompletedRecord(null)}
                    title="Delivery Completed!"
                  >
                    Receipt <strong>#{completedRecord.receiptNo}</strong> logged at{' '}
                    <code>{completedRecord.uploadedTime}</code>.
                  </Alert>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="tm-search-form tm-section-pad-2" style={{ padding: '25px 30px' }}>
                {error && <Alert type="danger">{error}</Alert>}

                {/* Form Fields: Inset FA Icons matching .tm-form-element */}
                <div className="row mb-3">
                  <div className="col-12 col-md-6 mb-3 mb-md-0">
                    <FormElement label="Receipt No." required>
                      <FormInput
                        id="receiptNo"
                        name="receiptNo"
                        icon="fa-hashtag"
                        placeholder="e.g. 7"
                        value={receiptNo}
                        onChange={(e) => setReceiptNo(e.target.value)}
                        required
                        disabled={isSubmitting}
                        style={{ fontSize: '1rem', fontWeight: 600 }}
                      />
                    </FormElement>
                  </div>

                  <div className="col-12 col-md-6">
                    <FormElement label="Customer / Order Detail" required>
                      <FormInput
                        id="customer"
                        name="customer"
                        icon="fa-user"
                        placeholder="e.g. Amit Verma (Flat 402)"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </FormElement>
                  </div>
                </div>

                {/* Upload Proof Slip */}
                <div className="mb-3">
                  <label
                    className="text-uppercase text-muted font-weight-bold d-block"
                    style={{ fontSize: '0.75rem', marginBottom: '8px', letterSpacing: '0.5px' }}
                  >
                    Upload Delivery Proof Slip <span className="text-danger">*</span>
                  </label>

                  {!imagePreview ? (
                    <div
                      onClick={() => !isSubmitting && fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #ee5057',
                        backgroundColor: '#FFF9F9',
                        padding: '24px 15px',
                        textAlign: 'center',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <i className="fa fa-camera fa-2x tm-color-primary mb-2"></i>
                      <div
                        className="text-uppercase tm-font-semibold"
                        style={{ fontSize: '0.9rem', color: '#1f3646' }}
                      >
                        Tap to Capture or Select Slip Image
                      </div>
                      <small className="text-muted">
                        Supports camera capture or file upload &bull; Stored directly in MongoDB GridFS
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
                        backgroundColor: '#F4F4F4',
                        border: '1px solid #ddd',
                        borderLeft: '4px solid #ee5057',
                        padding: '15px',
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f3646' }}>
                          <i className="fa fa-check mr-1 tm-color-primary"></i>
                          Selected: {imageFileName || 'Proof Image'}
                        </span>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon="fa-times"
                          onClick={handleRemoveImage}
                          disabled={isSubmitting}
                        >
                          Re-take
                        </Button>
                      </div>
                      <div className="text-center" style={{ maxHeight: '220px', overflow: 'hidden' }}>
                        <img
                          src={imagePreview}
                          alt="Slip Preview"
                          style={{
                            maxHeight: '200px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            border: '1px solid #ccc',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Touch Button */}
                <div className="mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={isSubmitting ? 'fa-spinner fa-spin' : 'fa-check'}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: '50px' }}
                  >
                    {isSubmitting ? 'Saving to MongoDB GridFS...' : 'Complete Delivery'}
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
