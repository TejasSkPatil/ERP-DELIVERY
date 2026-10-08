import React from 'react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import StatCard from '../components/common/StatCard';
import DeliveryTable from '../components/delivery/DeliveryTable';
import StorageManagementCard from '../components/admin/StorageManagementCard';
import ImageViewer from '../components/common/ImageViewer';
import { useDeliveries } from '../hooks/useDeliveries';
import { TEMPLATE_ASSETS } from '../assets';

export const AdminDashboardPage: React.FC = () => {
  const {
    deliveries,
    dailyStats,
    storageStats,
    selectedDate,
    setSelectedDate,
    selectedSlip,
    setSelectedSlip,
    triggerCleanup,
  } = useDeliveries();

  const todayStat = dailyStats.find((s) => s.isToday) || dailyStats[0];
  const filteredDeliveries = deliveries.filter((d) => d.deliveryDate === selectedDate);

  const sidebarItems = dailyStats.map((stat, idx) => ({
    id: stat.date,
    title: `${stat.date} ${stat.isToday ? '(Today)' : ''}`,
    subtitle: `${stat.totalDeliveries} Deliveries \u2022 ${stat.uploadedSlips} Slips`,
    imageUrl: TEMPLATE_ASSETS.thumbnails[idx % TEMPLATE_ASSETS.thumbnails.length],
    active: stat.date === selectedDate,
    onClick: () => setSelectedDate(stat.date),
  }));

  return (
    <>
      {/* 1. Global Layout Header */}
      <Header
        title={`${todayStat ? todayStat.totalDeliveries : deliveries.length} Deliveries Completed`}
        subtitle={`Date: ${selectedDate} (Asia/Kolkata) \u2022 Verified Slips: ${
          todayStat ? todayStat.uploadedSlips : deliveries.length
        }`}
        actionText="View Delivery Records"
        actionHref="#delivery-table-section"
        showDownArrow={true}
      />

      {/* 2. Feature Stat Cards Section */}
      <div className="container tm-pt-5 tm-pb-4">
        <div className="row text-center">
          <StatCard
            icon="fa-truck"
            title="Total Deliveries"
            count={todayStat ? todayStat.totalDeliveries : 24}
            subtitle="Completed &amp; logged today"
            badge="08 Oct 2026"
          />
          <StatCard
            icon="fa-camera"
            title="Uploaded Slips"
            count={todayStat ? todayStat.uploadedSlips : 24}
            subtitle="Stored natively in MongoDB GridFS"
            badge="100% Uploaded"
          />
          <StatCard
            icon="fa-calendar-check-o"
            title="Data Retention Window"
            count={`${storageStats.retentionDays} Days`}
            subtitle="Asia/Kolkata Calendar day cycle"
            badge="Strict Policy"
          />
        </div>
      </div>

      {/* 3. Delivery Table with Reusable Layout Sidebar */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="delivery-table-section">
        <div className="container">
          <div className="row">
            <DeliveryTable
              deliveries={filteredDeliveries}
              selectedDate={selectedDate}
              onViewSlip={(del) => setSelectedSlip(del)}
            />

            <Sidebar
              title="Daily Delivery Log"
              subtitle="Latest 32 calendar days retention window (Asia/Kolkata)"
              items={sidebarItems}
            />
          </div>
        </div>
      </div>

      {/* 4. 32-Day Retention Management */}
      <StorageManagementCard
        stats={storageStats}
        onTriggerCleanup={triggerCleanup}
      />

      {/* 5. Proof Slip Viewer Modal */}
      <ImageViewer
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </>
  );
};

export default AdminDashboardPage;
