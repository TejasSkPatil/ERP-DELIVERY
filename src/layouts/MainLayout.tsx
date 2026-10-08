import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import MainContentWrapper from '../components/layout/MainContentWrapper';
import { useAuth } from '../hooks/useAuth';

export const MainLayout: React.FC = () => {
  const { currentRole, switchRole } = useAuth();

  return (
    <MainContentWrapper id="top">
      {/* 1. Global Navbar */}
      <Navbar currentRole={currentRole} onRoleChange={switchRole} />

      {/* 2. Page Content Route View */}
      <main id="main-content">
        <Outlet />
      </main>

      {/* 3. Global Footer */}
      <Footer />
    </MainContentWrapper>
  );
};

export default MainLayout;
