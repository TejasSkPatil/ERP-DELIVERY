import React, { useState, useEffect } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import DeliverySummary from '../../components/dashboard/DeliverySummary';
import StatCard from '../../components/dashboard/StatCard';
import CalendarDeliveryChecker from '../../components/delivery/CalendarDeliveryChecker';
import StorageManagementCard from '../../components/admin/StorageManagementCard';
import SlipViewerModal from '../../components/delivery/SlipViewerModal';
import { DeliveryRecord, StorageStats } from '../../types/delivery';
import { UserRole } from '../../components/layout/Navbar';
import { deliveryService } from '../../services/deliveryService';

interface AdminDashboardProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentRole = 'ADMIN',
  onRoleChange,
}) => {
  const [selectedDate, setSelectedDate] = useState('07 Oct 2026');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [allDeliveries, setAllDeliveries] = useState<DeliveryRecord[]>([]);
  const [todayDeliveriesCount, setTodayDeliveriesCount] = useState<number>(0);
  const [todaySlipsCount, setTodaySlipsCount] = useState<number>(0);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    retentionDays: 32,
    oldestRecordDate: '06 Sep 2026',
    newestRecordDate: '07 Oct 2026',
    eligibleForDeletionCount: 0,
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [todayRes, allRes, storageRes] = await Promise.all([
        deliveryService.getTodayDeliveries(),
        deliveryService.getAllDeliveries(),
        deliveryService.getStorageStats(),
      ]);

      setTodayDeliveriesCount(todayRes.totalDeliveries);
      setTodaySlipsCount(todayRes.uploadedSlips);
      const deliveryList = Array.isArray(allRes) ? allRes : (allRes as any).deliveries || [];
      setAllDeliveries(deliveryList);
      setStorageStats(storageRes);

      const todayDate = deliveryList[0]?.deliveryDate || '07/10/2026';
      setSelectedDate(todayDate);
    } catch (err) {
      console.warn('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const element = document.getElementById('delivery-table-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTriggerCleanup = async () => {
    try {
      await deliveryService.cleanupOlderThan32Days();
      await fetchData();
    } catch (err) {
      console.error('Error running 32-day retention cleanup:', err);
    }
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
      {/* 1. Summary Red Banner */}
      <DeliverySummary
        totalDeliveries={todayDeliveriesCount}
        uploadedSlips={todaySlipsCount}
        selectedDate={selectedDate}
        onRefresh={fetchData}
      />

      {/* 2. Downward Arrow & Feature Stat Cards */}
      <div className="tm-section tm-position-relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="tm-section-down-arrow"
        >
          <polygon fill="#ee5057" points="0,0  100,0  50,60"></polygon>
        </svg>

        <div className="container tm-pt-5 tm-pb-4">
          <div className="row text-center">
            <StatCard
              icon="fa-truck"
              title="Today's Deliveries"
              count={todayDeliveriesCount}
              subtitle="Completed &amp; logged today"
              badge="07 Oct 2026"
            />
            <StatCard
              icon="fa-camera"
              title="Verified Proof Slips"
              count={todaySlipsCount}
              subtitle="Directly stored in MongoDB"
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
      </div>

      {/* 3. Delivery Table with Reusable Daily Log Sidebar */}
      <div className="tm-section tm-section-pad tm-bg-gray" id="delivery-table-section">
        <div className="container">
          <div className="row">
            {loading ? (
              <div className="col-12 text-center py-5">
                <i className="fa fa-spinner fa-spin fa-2x tm-color-primary"></i>
                <p className="mt-2 text-muted">Retrieving delivery logs from MongoDB...</p>
              </div>
            ) : (
              <>
                <CalendarDeliveryChecker
                  deliveries={allDeliveries}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onViewSlip={(del) => setSelectedDelivery(del)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. 32-Day Retention Management */}
      <StorageManagementCard
        stats={storageStats}
        onTriggerCleanup={handleTriggerCleanup}
      />

      {/* 5. Proof Slip Viewer Modal */}
      <SlipViewerModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />
    </PageContainer>
  );
};

export default AdminDashboard;
