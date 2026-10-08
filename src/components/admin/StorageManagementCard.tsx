import React, { useState } from 'react';
import { StorageStats } from '../../types/delivery';
import { Modal, Alert, Badge, Button } from '../ui';

interface StorageManagementCardProps {
  stats: StorageStats;
  onTriggerCleanup?: () => void;
}

export const StorageManagementCard: React.FC<StorageManagementCardProps> = ({
  stats,
  onTriggerCleanup,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cleanedMessage, setCleanedMessage] = useState(false);

  const handleConfirm = () => {
    setShowConfirmModal(false);
    if (onTriggerCleanup) {
      onTriggerCleanup();
    }
    setCleanedMessage(true);
    setTimeout(() => setCleanedMessage(false), 5000);
  };

  return (
    <div className="container my-5" id="storage-management-section">
      <div className="tm-bg-white tm-bg-white-shadow">
        <div
          className="tm-bg-primary tm-sidebar-pad d-flex flex-wrap justify-content-between align-items-center"
          style={{ padding: '20px 30px' }}
        >
          <div>
            <h3 className="tm-color-white tm-sidebar-title mb-1" style={{ fontSize: '1.4rem' }}>
              <i className="fa fa-database mr-2"></i> 32-Day Retention &amp; MongoDB GridFS Management
            </h3>
            <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.85rem' }}>
              System maintains strictly the latest 32 calendar days of delivery records and GridFS proof slips
            </p>
          </div>
          <div className="mt-2 mt-md-0">
            <Badge variant="navy">Retention Window: {stats.retentionDays} Days</Badge>
          </div>
        </div>

        <div className="tm-pad" style={{ padding: '30px' }}>
          {cleanedMessage && (
            <Alert type="success" onDismiss={() => setCleanedMessage(false)}>
              32-day data retention scan completed. Records and embedded GridFS images older than 32 days have been purged.
            </Alert>
          )}

          <div className="row text-center mb-4">
            <div className="col-sm-6 col-md-3 mb-3 mb-md-0">
              <div style={{ background: '#F4F4F4', padding: '18px 10px', borderTop: '3px solid #ee5057' }}>
                <span className="text-muted text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Active Policy
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f3646', marginTop: '5px' }}>
                  {stats.retentionDays} Days
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-md-3 mb-3 mb-md-0">
              <div style={{ background: '#F4F4F4', padding: '18px 10px', borderTop: '3px solid #1f3646' }}>
                <span className="text-muted text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Oldest Retained Record
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f3646', marginTop: '5px' }}>
                  {stats.oldestRecordDate}
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-md-3 mb-3 mb-md-0">
              <div style={{ background: '#F4F4F4', padding: '18px 10px', borderTop: '3px solid #1f3646' }}>
                <span className="text-muted text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Newest Record
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1f3646', marginTop: '5px' }}>
                  {stats.newestRecordDate}
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-md-3">
              <div style={{ background: '#F4F4F4', padding: '18px 10px', borderTop: '3px solid #ee5057' }}>
                <span className="text-muted text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  Eligible for Deletion
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ee5057', marginTop: '5px' }}>
                  {stats.eligibleForDeletionCount}
                </div>
              </div>
            </div>
          </div>

          <Alert type="warning">
            <strong>Note:</strong> Automated nightly cleanup runs at midnight Asia/Kolkata timezone via node-cron scheduler.
            You can also manually trigger the cleanup below to prune records and delete GridFS image chunks.
          </Alert>

          <div className="d-flex justify-content-end">
            <Button
              variant="primary"
              size="md"
              icon="fa-trash"
              onClick={() => setShowConfirmModal(true)}
            >
              Delete Data Older Than 32 Days
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm 32-Day Retention Cleanup"
        maxWidth="520px"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              style={{ backgroundColor: '#e0e0e0', color: '#333' }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              Confirm &amp; Delete
            </Button>
          </>
        }
      >
        <p style={{ color: '#333', lineHeight: '1.7' }}>
          This action will permanently delete all pizza delivery proof records and their corresponding GridFS
          slip image chunks older than 32 calendar days from MongoDB.
        </p>
        <p className="text-danger font-weight-bold mb-0" style={{ fontSize: '0.85rem' }}>
          <i className="fa fa-shield mr-1"></i> User accounts and credentials will NOT be touched.
        </p>
      </Modal>
    </div>
  );
};

export default StorageManagementCard;
