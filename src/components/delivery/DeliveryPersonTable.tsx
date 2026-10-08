import React from 'react';
import { DeliveryRecord } from '../../types/delivery';
import { Table, Column, Badge, Button } from '../ui';

interface DeliveryPersonTableProps {
  deliveries: DeliveryRecord[];
  onViewSlip: (delivery: DeliveryRecord) => void;
}

export const DeliveryPersonTable: React.FC<DeliveryPersonTableProps> = ({
  deliveries,
  onViewSlip,
}) => {
  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'receiptNo',
      header: 'Receipt No.',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#ee5057', fontSize: '1rem' }}>
          #{row.receiptNo}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => <strong>{row.customer}</strong>,
    },
    {
      key: 'uploadedTime',
      header: 'Upload Time',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', color: '#1f3646' }}>{row.uploadedTime}</span>
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
      header: 'Slip',
      align: 'center',
      render: (row) => (
        <Button variant="primary" size="sm" icon="fa-eye" onClick={() => onViewSlip(row)}>
          View
        </Button>
      ),
    },
  ];

  const headerBadge = (
    <Badge variant="success">{deliveries.length} Done Today</Badge>
  );

  return (
    <Table
      columns={columns}
      data={deliveries}
      keyExtractor={(row) => row.id}
      title="My Completed Deliveries Today"
      subtitle={`Showing ${deliveries.length} orders recorded with verified proof slips`}
      headerAction={headerBadge}
      emptyMessage="No deliveries recorded yet today. Complete your first delivery above!"
      className="mb-5"
    />
  );
};

export default DeliveryPersonTable;
