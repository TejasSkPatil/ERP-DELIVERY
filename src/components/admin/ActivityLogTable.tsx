import React, { useState } from 'react';
import { ActivityItem, ActivityAction } from '../../types/activity';
import { Badge } from '../ui';

interface ActivityLogTableProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const ActivityLogTable: React.FC<ActivityLogTableProps> = ({
  activities,
  isLoading = false,
  onRefresh,
}) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = activities.filter((act) => {
    if (filterAction !== 'ALL' && act.action !== filterAction) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        act.userName.toLowerCase().includes(q) ||
        act.description.toLowerCase().includes(q) ||
        act.userRole.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case 'SIGNUP':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#28a745',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '0.78rem',
              borderRadius: '4px',
              fontWeight: 700,
            }}
          >
            <i className="fa fa-user-plus mr-1"></i> SIGNUP SUCCESS
          </span>
        );
      case 'LOGIN':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#007bff',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '0.78rem',
              borderRadius: '4px',
              fontWeight: 700,
            }}
          >
            <i className="fa fa-sign-in mr-1"></i> LOGIN SUCCESS
          </span>
        );
      case 'LOGOUT':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#6c757d',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '0.78rem',
              borderRadius: '4px',
              fontWeight: 700,
            }}
          >
            <i className="fa fa-sign-out mr-1"></i> LOGOUT SUCCESS
          </span>
        );
      default:
        return <Badge variant="navy">{action}</Badge>;
    }
  };

  const loginCount = activities.filter((a) => a.action === 'LOGIN').length;
  const signupCount = activities.filter((a) => a.action === 'SIGNUP').length;
  const logoutCount = activities.filter((a) => a.action === 'LOGOUT').length;

  return (
    <div className="col-12" id="activity-log-section">
      <div
        className="tm-bg-white mb-4"
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid #eaeaea',
        }}
      >
        {/* Header Bar */}
        <div
          className="tm-bg-primary text-white p-3 d-flex flex-wrap align-items-center justify-content-between"
          style={{ gap: '12px' }}
        >
          <div className="d-flex align-items-center" style={{ gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              <i className="fa fa-history"></i>
            </div>
            <div>
              <h4 className="m-0 text-white font-weight-bold" style={{ fontSize: '1.2rem' }}>
                Authentication &amp; User Activity Log
              </h4>
              <p className="m-0 text-white-50" style={{ fontSize: '0.8rem' }}>
                Real-time tracking for Login, Logout, and Sign Up events in Asia/Kolkata
              </p>
            </div>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="btn btn-light btn-sm font-weight-bold d-flex align-items-center"
              style={{ color: '#ee5057' }}
            >
              <i className={`fa fa-refresh mr-1 ${isLoading ? 'fa-spin' : ''}`}></i>
              Refresh Feed
            </button>
          )}
        </div>

        {/* Counters & Filter Controls */}
        <div
          className="p-3 bg-light border-bottom d-flex flex-wrap align-items-center justify-content-between"
          style={{ gap: '12px' }}
        >
          {/* Quick Counter Pills */}
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFilterAction('ALL')}
              className={`btn btn-sm ${filterAction === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '20px' }}
            >
              All Events ({activities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('SIGNUP')}
              className={`btn btn-sm ${filterAction === 'SIGNUP' ? 'btn-success' : 'btn-outline-success'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '20px' }}
            >
              <i className="fa fa-user-plus mr-1"></i> Signups ({signupCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('LOGIN')}
              className={`btn btn-sm ${filterAction === 'LOGIN' ? 'btn-primary' : 'btn-outline-primary'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '20px' }}
            >
              <i className="fa fa-sign-in mr-1"></i> Logins ({loginCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterAction('LOGOUT')}
              className={`btn btn-sm ${filterAction === 'LOGOUT' ? 'btn-secondary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.78rem', fontWeight: 600, borderRadius: '20px' }}
            >
              <i className="fa fa-sign-out mr-1"></i> Logouts ({logoutCount})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <i
              className="fa fa-search text-muted"
              style={{ position: 'absolute', left: '10px', top: '10px', fontSize: '0.85rem' }}
            ></i>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search user or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', height: '34px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="table table-hover mb-0" style={{ fontSize: '0.88rem' }}>
            <thead style={{ backgroundColor: '#fcfcfc', borderBottom: '2px solid #eee' }}>
              <tr>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Activity Action</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Staff / User</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Assigned Role</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Activity Description</th>
                <th style={{ color: '#1f3646', fontWeight: 700 }}>Timestamp (Asia/Kolkata)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <i className="fa fa-clock-o fa-2x mb-2 d-block"></i>
                    No activity records found matching this criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const dateObj = new Date(item.timestamp);
                  const formattedTime = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleString('en-GB', {
                        timeZone: 'Asia/Kolkata',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }) + ' IST'
                    : item.timestamp;

                  return (
                    <tr key={item.id} style={{ verticalAlign: 'middle' }}>
                      <td>{getActionBadge(item.action)}</td>
                      <td>
                        <strong style={{ color: '#1f3646' }}>{item.userName}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            backgroundColor: item.userRole === 'ADMIN' ? '#e9ecef' : '#fbe9ea',
                            color: item.userRole === 'ADMIN' ? '#495057' : '#ee5057',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            borderRadius: '3px',
                          }}
                        >
                          <i
                            className={`fa ${
                              item.userRole === 'ADMIN' ? 'fa-shield' : 'fa-motorcycle'
                            } mr-1`}
                          ></i>
                          {item.userRole === 'DELIVERY_PERSON' ? 'DELIVERY BOY' : item.userRole}
                        </span>
                      </td>
                      <td style={{ color: '#444' }}>
                        <span>{item.description}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#1f3646', fontSize: '0.82rem' }}>
                        <i className="fa fa-calendar-check-o text-muted mr-1"></i>
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogTable;
