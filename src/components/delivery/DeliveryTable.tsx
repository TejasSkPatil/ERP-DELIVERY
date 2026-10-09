import React, { useState } from 'react';
import { DeliveryRecord } from '../../types/delivery';
import { Table, Column, Badge, Button } from '../ui';

interface DeliveryTableProps {
  deliveries: DeliveryRecord[];
  selectedDate: string;
  onViewSlip: (delivery: DeliveryRecord) => void;
}

export const DeliveryTable: React.FC<DeliveryTableProps> = ({
  deliveries,
  selectedDate,
  onViewSlip,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDeliveries = deliveries.filter((item) => {
    const recipientText = item.recipientName || item.customer || '';
    return (
      item.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipientText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.deliveryPerson && item.deliveryPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'receiptNo',
      header: 'Receipt No.',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#ee5057', fontSize: '0.95rem' }}>
          #{row.receiptNo}
        </span>
      ),
    },
    {
      key: 'deliveryPerson',
      header: 'Delivery Person',
      render: (row) => (
        <div style={{ fontWeight: 600, color: '#333' }}>
          <i className="fa fa-motorcycle mr-1 text-muted"></i> {row.deliveryPerson}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Recipient Information',
      render: (row) => (
        <div>
          <i className="fa fa-map-marker mr-1 tm-color-primary"></i>
          {row.recipientName || row.customer || 'Standard Recipient'}
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (row) => <span className="text-muted">{row.deliveryDate}</span>,
    },
    {
      key: 'uploadedTime',
      header: 'Uploaded Time',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1f3646' }}>
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
      header: 'Action',
      align: 'center',
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          icon="fa-eye"
          onClick={() => onViewSlip(row)}
        >
          View Slip
        </Button>
      ),
    },
  ];

  const searchBox = (
    <div style={{ position: 'relative', minWidth: '220px', marginTop: '10px' }}>
      <i
        className="fa fa-search tm-form-element-icon"
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
        placeholder="Search Receipt # or Name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          paddingLeft: '38px',
          height: '42px',
          fontSize: '0.85rem',
        }}
      />
    </div>
  );

  return (
    <div className="col-12">
      <Table
        columns={columns}
        data={filteredDeliveries}
        keyExtractor={(row) => row.id}
        title={`Delivery Records for ${selectedDate}`}
        subtitle={`Showing ${filteredDeliveries.length} verified deliveries with GridFS proof slips`}
        headerAction={searchBox}
        emptyMessage="No delivery records found matching this criteria."
      />
    </div>
  );
};

export default DeliveryTable;
