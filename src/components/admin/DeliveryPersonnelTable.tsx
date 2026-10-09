import React from 'react';
import { DeliveryPersonStat } from '../../types/delivery';
import { Badge } from '../ui';

interface DeliveryPersonnelTableProps {
  agents: DeliveryPersonStat[];
  onRefresh?: () => void;
}

export const DeliveryPersonnelTable: React.FC<DeliveryPersonnelTableProps> = ({
  agents,
  onRefresh,
}) => {
  return (
    <div className="col-12">
      <div
        className="tm-bg-white"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '30px',
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h4
              style={{
                margin: 0,
                color: '#1f3646',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              <i className="fa fa-users tm-color-primary mr-2"></i>
              Active Delivery Personnel ({agents.length})
            </h4>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#666',
                fontSize: '0.85rem',
              }}
            >
              Application accounts strictly restricted to operational roles (ADMIN, DELIVERY_PERSON).
            </p>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn tm-btn-primary"
              style={{
                backgroundColor: '#ee5057',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <i className="fa fa-refresh mr-1"></i> Refresh Staff
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#fcfcfc', borderBottom: '2px solid #eee' }}>
              <tr>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Staff Member</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Role &amp; Phone</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }} className="text-center">
                  Total Completed
                </th>
                <th style={{ color: '#1f3646', fontWeight: 700 }} className="text-center">
                  Slips Uploaded
                </th>
                <th style={{ color: '#1f3646', fontWeight: 700 }} className="text-center">
                  Today (Deliveries / Slips)
                </th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Last Active Delivery</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }} className="text-center">
                  Account Status
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const formattedLastActive = agent.lastDeliveryAt
                  ? new Date(agent.lastDeliveryAt).toLocaleString('en-GB', {
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) + ' IST'
                  : 'No deliveries yet';

                return (
                  <tr key={agent.id} style={{ verticalAlign: 'middle' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1f3646' }}>{agent.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#777' }}>
                        <i className="fa fa-envelope-o mr-1"></i>
                        {agent.email}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          backgroundColor: '#fbe9ea',
                          color: '#ee5057',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          borderRadius: '3px',
                          marginBottom: '3px',
                        }}
                      >
                        <i className="fa fa-motorcycle mr-1"></i>{' '}
                        {agent.role === 'DELIVERY_PERSON' ? 'DELIVERY BOY' : agent.role}
                      </span>
                      <div style={{ fontSize: '0.78rem', color: '#555' }}>
                        <i className="fa fa-phone mr-1"></i> {agent.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="text-center" style={{ fontWeight: 700, color: '#1f3646', fontSize: '1rem' }}>
                      {agent.totalDeliveries}
                    </td>
                    <td className="text-center">
                      <span
                        style={{
                          color: '#28a745',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          backgroundColor: '#eafaf1',
                          padding: '2px 8px',
                          borderRadius: '3px',
                        }}
                      >
                        <i className="fa fa-file-image-o mr-1"></i>
                        {agent.totalSlips}
                      </span>
                    </td>
                    <td className="text-center">
                      <span style={{ fontWeight: 700, color: '#ee5057' }}>
                        {agent.todayDeliveries}
                      </span>{' '}
                      / <span style={{ fontWeight: 600, color: '#28a745' }}>{agent.todaySlips}</span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#444' }}>
                      <i className="fa fa-clock-o mr-1 text-muted"></i>
                      {formattedLastActive}
                    </td>
                    <td className="text-center">
                      <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPersonnelTable;
