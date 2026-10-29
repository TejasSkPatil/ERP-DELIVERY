import React from 'react';
import { DeliveryRecord } from '../../types/delivery';
import { Table, Column, Badge, Button } from '../ui';
import { formatDisplayDate } from '../../utils/timeZone';

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
      key: 'receiptDate',
      header: 'Receipt Date.',
      render: (row) => (
        <span style={{ fontWeight: 500, color: '#2c3e50' }}>
          {formatDisplayDate(row.receiptDate || row.deliveryDate)}
        </span>
      ),
    },
    {
      key: 'receiptTime',
      header: 'Receipt Time.',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1f3646' }}>
          {row.receiptTime || '-'}
        </span>
      ),
    },
    {
      key: 'orderType',
      header: 'Order Type',
      align: 'center',
      render: (row) => (
        <Badge variant="success">
          {row.orderType || 'DELIVERY'}
        </Badge>
      ),
    },
    {
      key: 'slipImageUrl',
      header: 'Receipt Image',
      align: 'center',
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          icon="fa-file-image-o"
          onClick={() => onViewSlip(row)}
          style={{ backgroundColor: '#ee5057', borderColor: '#ee5057' }}
        >
          View Slip
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
