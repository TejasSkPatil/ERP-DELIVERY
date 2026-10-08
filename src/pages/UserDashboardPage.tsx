import React, { useState } from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import ImageViewer from '../components/common/ImageViewer';
import { Table, Column, Badge, Button } from '../components/ui';
import { DeliveryRecord } from '../types/delivery';
import { useDeliveries } from '../hooks/useDeliveries';

export const UserDashboardPage: React.FC = () => {
  const { deliveries, selectedSlip, setSelectedSlip } = useDeliveries();
  const [searchReceipt, setSearchReceipt] = useState('');

  const filteredDeliveries = deliveries.filter((d) =>
    d.receiptNo.toLowerCase().includes(searchReceipt.trim().toLowerCase())
  );

  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'receiptNo',
      header: 'Receipt No.',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#ee5057', fontSize: '1.05rem' }}>
          #{row.receiptNo}
        </span>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#333' }}>
          <i className="fa fa-calendar-o mr-1 text-muted"></i>
          {row.deliveryDate}
        </span>
      ),
    },
    {
      key: 'uploadedTime',
      header: 'Uploaded Time',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', color: '#1f3646' }}>
          <i className="fa fa-clock-o mr-1 text-muted"></i>
          {row.uploadedTime}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Completed' ? 'success' : 'warning'} icon="fa-check">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Delivery Slip',
      align: 'center',
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          icon="fa-file-image-o"
          onClick={() => setSelectedSlip(row)}
        >
          View Slip
        </Button>
      ),
    },
  ];

  const searchBox = (
    <div style={{ position: 'relative', minWidth: '220px', marginTop: '10px' }}>
      <i
        className="fa fa-hashtag tm-form-element-icon"
        style={{
          position: 'absolute',
          left: '12px',
          top: '12px',
          color: '#ee5057',
        }}
      ></i>
      <input
        type="text"
        className="form-control"
        placeholder="Filter Receipt # (e.g. 7)..."
        value={searchReceipt}
        onChange={(e) => setSearchReceipt(e.target.value)}
        style={{
          paddingLeft: '38px',
          height: '42px',
          fontSize: '0.85rem',
        }}
      />
    </div>
  );

  return (
    <>
      {/* 1. Global Layout Header */}
      <Header
        title="My Pizza Deliveries"
        subtitle="Customer: Amit Verma \u2022 Verified delivery slips and arrival timestamps"
        actionText={`View My Slips (${deliveries.length})`}
        actionHref="#my-deliveries-section"
        showDownArrow={true}
      />

      {/* 2. My Deliveries Grid with Reusable Sidebar */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="my-deliveries-section">
        <div className="container">
          <div className="row">
            <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
              <Table
                columns={columns}
                data={filteredDeliveries}
                keyExtractor={(row) => row.id}
                title="My Delivery Records"
                subtitle="All delivery slips uploaded directly by delivery personnel into MongoDB GridFS"
                headerAction={searchBox}
                emptyMessage={`No delivery found matching "${searchReceipt}".`}
              />
            </div>

            {/* Reusable Sidebar */}
            <Sidebar
              title="Proof Verification"
              subtitle="Single source of truth image storage"
              id="support-info"
            >
              <div
                style={{
                  background: '#F4F4F4',
                  padding: '16px',
                  borderLeft: '4px solid #ee5057',
                  marginBottom: '18px',
                  fontSize: '0.85rem',
                  lineHeight: '1.7',
                }}
              >
                <strong><i className="fa fa-check-circle tm-color-primary mr-1"></i> One Official Slip:</strong>
                <br />
                The image displayed here is the identical proof slip uploaded by the delivery person upon arrival,
                stored directly in MongoDB GridFS.
              </div>

              <div
                style={{
                  background: '#F4F4F4',
                  padding: '16px',
                  borderLeft: '4px solid #1f3646',
                  marginBottom: '18px',
                  fontSize: '0.85rem',
                  lineHeight: '1.7',
                }}
              >
                <strong><i className="fa fa-clock-o mr-1"></i> Automated Timestamps:</strong>
                <br />
                Upload dates and times are generated directly in Asia/Kolkata timezone.
              </div>
            </Sidebar>
          </div>
        </div>
      </div>

      <ImageViewer
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </>
  );
};

export default UserDashboardPage;
