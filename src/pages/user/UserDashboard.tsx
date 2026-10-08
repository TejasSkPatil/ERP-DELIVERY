import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import SlipViewerModal from '../../components/delivery/SlipViewerModal';
import { DeliveryRecord } from '../../types/delivery';
import { UserRole } from '../../components/layout/Navbar';
import { deliveryService } from '../../services/deliveryService';

interface UserDashboardProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentRole = 'USER',
  onRoleChange,
}) => {
  const [customerDeliveries, setCustomerDeliveries] = useState<DeliveryRecord[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<DeliveryRecord | null>(null);
  const [searchReceipt, setSearchReceipt] = useState('');
  const [activeTab, setActiveTab] = useState('my-deliveries');
  const [loading, setLoading] = useState(true);

  const fetchCustomerDeliveries = async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getMyDeliveries();
      setCustomerDeliveries(res.deliveries);
    } catch (err) {
      console.warn('Error fetching customer deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDeliveries();
  }, []);

  const filteredDeliveries = customerDeliveries.filter((d) =>
    d.receiptNo.toLowerCase().includes(searchReceipt.trim().toLowerCase())
  );

  return (
    <PageContainer
      brandName="Level Delivery"
      logoSrc="img/logo.png"
      currentRole={currentRole}
      onRoleChange={onRoleChange}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* 1. Red Banner */}
      <div className="tm-section-2">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2 className="tm-section-title">My Pizza Deliveries</h2>
              <p className="tm-color-white tm-section-subtitle">
                Customer: <strong>Amit Verma</strong> &bull; Verified delivery slips and arrival timestamps
              </p>
              <a href="#my-deliveries-section" className="tm-color-white tm-btn-white-bordered">
                View My Slips ({customerDeliveries.length})
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Downward Arrow */}
      <div className="tm-section tm-position-relative" style={{ minHeight: 'auto' }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="tm-section-down-arrow"
        >
          <polygon fill="#ee5057" points="0,0  100,0  50,60"></polygon>
        </svg>
      </div>

      {/* 3. My Deliveries Grid with Sidebar */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="my-deliveries-section">
        <div className="container">
          <div className="row">
            <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
              <div className="tm-bg-white tm-bg-white-shadow" style={{ padding: '30px' }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
                  <div>
                    <h3
                      className="text-uppercase tm-font-semibold mb-1"
                      style={{ fontSize: '1.4rem', color: '#1f3646' }}
                    >
                      <i className="fa fa-truck mr-2 tm-color-primary"></i>
                      My Delivery Records
                    </h3>
                    <p className="tm-margin-b-0" style={{ fontSize: '0.85rem' }}>
                      All delivery slips uploaded directly by delivery personnel
                    </p>
                  </div>

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
                </div>

                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#F4F4F4',
                          borderBottom: '2px solid #ee5057',
                          color: '#1f3646',
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                          letterSpacing: '0.5px',
                        }}
                      >
                        <th style={{ padding: '14px 12px' }}>Receipt No.</th>
                        <th style={{ padding: '14px 12px' }}>Delivery Date</th>
                        <th style={{ padding: '14px 12px' }}>Uploaded Time</th>
                        <th style={{ padding: '14px 12px' }}>Status</th>
                        <th style={{ padding: '14px 12px', textAlign: 'center' }}>Delivery Slip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            <i className="fa fa-spinner fa-spin fa-2x tm-color-primary mb-2 d-block"></i>
                            Loading your delivery records...
                          </td>
                        </tr>
                      ) : filteredDeliveries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted">
                            <i className="fa fa-search fa-2x tm-color-primary mb-2 d-block"></i>
                            No delivery found for Receipt #{searchReceipt}
                          </td>
                        </tr>
                      ) : (
                        filteredDeliveries.map((delivery) => (
                          <tr key={delivery.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#ee5057',
                                  fontSize: '1.05rem',
                                }}
                              >
                                #{delivery.receiptNo}
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'middle', fontWeight: 600, color: '#333' }}>
                              <i className="fa fa-calendar-o mr-1 text-muted"></i>
                              {delivery.deliveryDate}
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'middle', fontFamily: 'monospace', color: '#1f3646' }}>
                              <i className="fa fa-clock-o mr-1 text-muted"></i>
                              {delivery.uploadedTime}
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'middle' }}>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  borderRadius: 0,
                                  padding: '5px 9px',
                                  fontSize: '0.7rem',
                                  textTransform: 'uppercase',
                                }}
                              >
                                <i className="fa fa-check mr-1"></i> {delivery.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setSelectedSlip(delivery)}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <i className="fa fa-file-image-o mr-1"></i> View Slip
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-sm-12 col-md-12 col-lg-4 col-xl-4 tm-recommended-container">
              <div className="tm-bg-white tm-bg-white-shadow">
                <div className="tm-bg-primary tm-sidebar-pad">
                  <h3 className="tm-color-white tm-sidebar-title" style={{ fontSize: '1.25rem' }}>
                    <i className="fa fa-shield mr-2"></i> Proof Verification
                  </h3>
                  <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.85rem' }}>
                    Single source of truth image storage
                  </p>
                </div>

                <div className="tm-sidebar-pad-2" id="support-info">
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
                    stored directly and securely in MongoDB.
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
                    Upload dates and times are generated directly by the server in Asia/Kolkata timezone.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SlipViewerModal
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </PageContainer>
  );
};

export default UserDashboard;
