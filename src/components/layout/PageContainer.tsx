import React, { ReactNode } from 'react';
import Navbar, { UserRole } from './Navbar';
import Footer from './Footer';

interface PageContainerProps {
  children: ReactNode;
  brandName?: string;
  logoSrc?: string;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  brandName = 'Level Delivery',
  logoSrc = 'img/logo.png',
  currentRole = 'DELIVERY_PERSON',
  onRoleChange,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="tm-main-content" id="top">
      <Navbar
        brandName={brandName}
        logoSrc={logoSrc}
        currentRole={currentRole}
        onRoleChange={onRoleChange}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      {children}
      <Footer companyName="ERP-DELIVERY &bull; Level Template" />
    </div>
  );
};

export default PageContainer;
