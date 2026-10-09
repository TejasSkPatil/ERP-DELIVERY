import React from 'react';
import Header from '../components/layout/Header';
import DeliveryForm from '../components/delivery/DeliveryForm';
import DeliveryPersonTable from '../components/delivery/DeliveryPersonTable';
import ImageViewer from '../components/common/ImageViewer';
import { useDeliveries } from '../hooks/useDeliveries';

export const DeliveryDashboardPage: React.FC = () => {
  const {
    deliveries,
    addDelivery,
    selectedSlip,
    setSelectedSlip,
  } = useDeliveries();

  return (
    <>
      {/* 1. Hero Delivery Entry Card with Background Image */}
      <DeliveryForm
        todayCount={deliveries.length}
        onCompleteDelivery={addDelivery}
      />

      {/* 2. Global Layout Header Component */}
      <Header
        title={`${deliveries.length} Deliveries Completed Today`}
        subtitle="Date: 08 Oct 2026 (Asia/Kolkata) \u2022 Agent: Bhushan Lokhande (DP-01)"
        actionText={`View My Slips (${deliveries.length})`}
        actionHref="#my-deliveries-section"
        showDownArrow={true}
      />

      {/* 3. Completed History Section */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="my-deliveries-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 col-xl-9">
              <DeliveryPersonTable
                deliveries={deliveries}
                onViewSlip={(del) => setSelectedSlip(del)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Proof Slip Modal */}
      <ImageViewer
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </>
  );
};

export default DeliveryDashboardPage;
