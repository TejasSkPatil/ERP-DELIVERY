import React from 'react';

interface DeliverySummaryProps {
  totalDeliveries: number;
  uploadedSlips: number;
  selectedDate: string;
  onRefresh?: () => void;
}

export const DeliverySummary: React.FC<DeliverySummaryProps> = ({
  totalDeliveries,
  uploadedSlips,
  selectedDate,
  onRefresh,
}) => {
  return (
    <div className="tm-section-2">
      <div className="container">
        <div className="row">
          <div className="col text-center">
            <h2 className="tm-section-title" style={{ marginBottom: '10px' }}>
              {totalDeliveries} Deliveries Completed
            </h2>
            <p className="tm-color-white tm-section-subtitle">
              Date: <strong>{selectedDate}</strong> (Asia/Kolkata) &bull; Verified Slips:{' '}
              <strong>{uploadedSlips}</strong>
            </p>
            <div style={{ display: 'inline-flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href="#delivery-table-section"
                className="tm-color-white tm-btn-white-bordered"
              >
                View Delivery Records
              </a>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="tm-color-white tm-btn-white-bordered"
                  style={{ cursor: 'pointer' }}
                >
                  <i className="fa fa-refresh mr-1"></i> Refresh Counter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverySummary;
