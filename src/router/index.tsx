import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DeliveryDashboardPage from '../pages/DeliveryDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminRouteGuard from '../components/auth/AdminRouteGuard';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Operations Hub */}
        <Route index element={<DeliveryDashboardPage />} />
        <Route path="delivery" element={<DeliveryDashboardPage />} />
        <Route
          path="admin"
          element={
            <AdminRouteGuard>
              <AdminDashboardPage />
            </AdminRouteGuard>
          }
        />

        {/* Deprecated customer paths redirect gracefully to operations */}
        <Route path="customer" element={<Navigate to="/delivery" replace />} />
        <Route path="my-deliveries" element={<Navigate to="/delivery" replace />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
