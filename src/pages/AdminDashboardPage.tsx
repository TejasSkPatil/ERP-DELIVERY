import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import StatCard from '../components/common/StatCard';
import CalendarDeliveryChecker from '../components/delivery/CalendarDeliveryChecker';
import DeliveryPersonnelTable from '../components/admin/DeliveryPersonnelTable';
import ActivityLogTable from '../components/admin/ActivityLogTable';
import StorageManagementCard from '../components/admin/StorageManagementCard';
import ImageViewer from '../components/common/ImageViewer';
import { useDeliveries } from '../hooks/useDeliveries';
import { deliveryService } from '../services/deliveryService';
import { DeliveryPersonStat, DeliveryRecord } from '../types/delivery';
import { ActivityItem } from '../types/activity';

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

  const [activeView, setActiveView] = useState<'deliveries' | 'staff' | 'activities'>('deliveries');
  const [agents, setAgents] = useState<DeliveryPersonStat[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<DeliveryRecord[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState<boolean>(true);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);

  const fetchAgentsAndDeliveries = async () => {
    try {
      setLoadingAgents(true);
      const [agentsData, allDelData, actData] = await Promise.all([
        deliveryService.getDeliveryPersonsList(),
        deliveryService.getAllDeliveries(),
        deliveryService.getActivities(),
      ]);
      setAgents(agentsData);
      setAllDeliveries(allDelData);
      setActivities(actData);
    } catch (err) {
      console.warn('Error fetching admin data:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchActivitiesOnly = async () => {
    try {
      setLoadingActivities(true);
      const actData = await deliveryService.getActivities();
      setActivities(actData);
    } catch (err) {
      console.warn('Error fetching activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchAgentsAndDeliveries();
  }, []);

  const todayStat = dailyStats.find((s) => s.isToday) || dailyStats[0];
  const totalDeliveriesSource = allDeliveries.length > 0 ? allDeliveries : deliveries;
  const totalSlipsCount = totalDeliveriesSource.filter((d) => d.slipFileId || d.slipImageUrl).length;
  const todaySlipsCount = todayStat ? todayStat.uploadedSlips : totalSlipsCount;

  return (
    <>
      {/* 1. Global Layout Header */}
      <Header
        title="Admin Operations Console"
        subtitle={`System Overview \u2022 Role Architecture: ADMIN & DELIVERY_PERSON \u2022 Selected Date: ${selectedDate}`}
        actionText="Check Calendar & Deliveries"
        actionHref="#delivery-table-section"
        showDownArrow={true}
      />

      {/* 2. Top Metric Cards Section */}
      <div className="container tm-pt-5 tm-pb-3" id="admin-main-section">
        <div className="row text-center">
          <StatCard
            icon="fa-truck"
            title="Total Deliveries"
            count={totalDeliveriesSource.length}
            subtitle="Retained across 32 days"
            badge="Audited"
          />
          <StatCard
            icon="fa-camera"
            title="Total Slips Uploaded"
            count={totalSlipsCount}
            subtitle="Stored in MongoDB GridFS"
            badge="100% Retained"
          />
          <StatCard
            icon="fa-calendar-check-o"
            title="Today's Deliveries"
            count={todayStat ? todayStat.totalDeliveries : deliveries.length}
            subtitle={`Slips uploaded today: ${todaySlipsCount}`}
            badge={todayStat?.date || '08 Oct 2026'}
          />
          <StatCard
            icon="fa-users"
            title="Active Delivery Staff"
            count={agents.length || 3}
            subtitle="Delivery personnel accounts"
            badge="Staff Only"
          />
        </div>
      </div>

      {/* 3. Operational Navigation Tabs */}
      <div className="container tm-pb-4">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            borderBottom: '2px solid #eee',
            paddingBottom: '16px',
          }}
        >
          <button
            onClick={() => setActiveView('deliveries')}
            className={`btn ${activeView === 'deliveries' ? 'tm-btn-primary' : 'btn-light'}`}
            style={{
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: activeView === 'deliveries' ? '#ee5057' : '#f4f4f4',
              color: activeView === 'deliveries' ? '#fff' : '#1f3646',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa fa-calendar mr-2"></i> Calendar &amp; Deliveries
          </button>
          <button
            onClick={() => setActiveView('staff')}
            className={`btn ${activeView === 'staff' ? 'tm-btn-primary' : 'btn-light'}`}
            style={{
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: activeView === 'staff' ? '#ee5057' : '#f4f4f4',
              color: activeView === 'staff' ? '#fff' : '#1f3646',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa fa-users mr-2"></i> Application Accounts &amp; Staff ({agents.length})
          </button>
          <button
            onClick={() => setActiveView('activities')}
            className={`btn ${activeView === 'activities' ? 'tm-btn-primary' : 'btn-light'}`}
            style={{
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '0.9rem',
              backgroundColor: activeView === 'activities' ? '#ee5057' : '#f4f4f4',
              color: activeView === 'activities' ? '#fff' : '#1f3646',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="fa fa-history mr-2"></i> Activity Log ({activities.length})
          </button>
        </div>
      </div>

      {/* 4. Tab Content: Staff Accounts Management */}
      {activeView === 'staff' && (
        <div className="tm-section tm-section-pad tm-bg-gray">
          <div className="container">
            <div className="row">
              <DeliveryPersonnelTable agents={agents} onRefresh={fetchAgentsAndDeliveries} />
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content: Authentication & User Activity Log */}
      {activeView === 'activities' && (
        <div className="tm-section tm-section-pad tm-bg-gray" id="activity-log-wrapper">
          <div className="container">
            <div className="row">
              <ActivityLogTable
                activities={activities}
                isLoading={loadingActivities}
                onRefresh={fetchActivitiesOnly}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab Content: Calendar & Delivery Records with Person Checker (NO ASIDE) */}
      {activeView === 'deliveries' && (
        <div className="tm-section tm-section-pad tm-bg-gray" id="delivery-table-section">
          <div className="container">
            <div className="row">
              <CalendarDeliveryChecker
                deliveries={totalDeliveriesSource}
                agents={agents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onViewSlip={(del) => setSelectedSlip(del)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. 32-Day Retention Management */}
      <StorageManagementCard
        stats={storageStats}
        onTriggerCleanup={triggerCleanup}
      />

      {/* 7. Proof Slip Viewer Modal */}
      <ImageViewer
        delivery={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />
    </>
  );
};

export default AdminDashboardPage;
