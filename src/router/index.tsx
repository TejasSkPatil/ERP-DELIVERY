import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DeliveryDashboardPage from '../pages/DeliveryDashboardPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import UserDashboardPage from '../pages/UserDashboardPage';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DeliveryDashboardPage />} />
        <Route path="delivery" element={<DeliveryDashboardPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="customer" element={<UserDashboardPage />} />
        <Route path="my-deliveries" element={<Navigate to="/customer" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
