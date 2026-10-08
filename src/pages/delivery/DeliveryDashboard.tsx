import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import DeliveryForm from '../../components/delivery/DeliveryForm';
import DeliveryPersonTable from '../../components/delivery/DeliveryPersonTable';
import SlipViewerModal from '../../components/delivery/SlipViewerModal';
import { DeliveryRecord } from '../../types/delivery';
import { UserRole } from '../../components/layout/Navbar';
import { deliveryService } from '../../services/deliveryService';

interface DeliveryDashboardProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({
  currentRole = 'DELIVERY_PERSON',
  onRoleChange,
}) => {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [todayDeliveriesCount, setTodayDeliveriesCount] = useState<number>(0);
  const [selectedSlip, setSelectedSlip] = useState<DeliveryRecord | null>(null);
  const [activeTab, setActiveTab] = useState('entry');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDeliveries = async () => {
    try {
      const [todayRes, myRes] = await Promise.all([
        deliveryService.getTodayDeliveries(),
        deliveryService.getMyDeliveries(),
      ]);
      setTodayDeliveriesCount(todayRes.totalDeliveries);
      setDeliveries(myRes.deliveries);
    } catch (err) {
      console.warn('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleDeliveryCreated = (newRecord: DeliveryRecord) => {
    setDeliveries((prev) => [newRecord, ...prev]);
    setTodayDeliveriesCount((prev) => prev + 1);
  };

  return (
    <PageContainer
      brandName="Level Delivery"
      logoSrc="img/logo.png"
      currentRole={currentRole}
      onRoleChange={onRoleChange}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* 1. Hero Delivery Entry Card with Background Image */}
      <DeliveryForm
        todayCount={todayDeliveriesCount}
        onDeliveryCreated={handleDeliveryCreated}
      />

      {/* 2. Red Shift Summary Banner */}
      <div className="tm-section-2">
        <div className="container">
          <div className="row">
            <div className="col text-center">
              <h2 className="tm-section-title">
                {todayDeliveriesCount} Deliveries Completed Today
              </h2>
              <p className="tm-color-white tm-section-subtitle">
                Date: <strong>07 Oct 2026</strong> (Asia/Kolkata) &bull; Agent: <strong>Rahul Sharma (DP-01)</strong>
              </p>
              <a href="#my-deliveries-section" className="tm-color-white tm-btn-white-bordered">
                View My Slips ({deliveries.length})
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Downward Arrow & Deliveries Table */}
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

      {/* 4. Completed History Section */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="my-deliveries-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 col-xl-9">
              {loading ? (
                <div className="text-center py-5">
                  <i className="fa fa-spinner fa-spin fa-2x tm-color-primary"></i>
                  <p className="mt-2 text-muted">Loading today's delivery records...</p>
                </div>
              ) : (
                <DeliveryPersonTable
                  deliveries={deliveries}
                  onViewSlip={(del) => setSelectedSlip(del)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proof Slip Modal */}
      <SlipViewerModal
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </PageContainer>
  );
};

export default DeliveryDashboard;
