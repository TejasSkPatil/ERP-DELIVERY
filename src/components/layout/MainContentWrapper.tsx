import React, { ReactNode } from 'react';

interface MainContentWrapperProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

export const MainContentWrapper: React.FC<MainContentWrapperProps> = ({
  children,
  id = 'top',
  className = '',
}) => {
  return (
    <div className={`tm-main-content ${className}`.trim()} id={id}>
      {children}
    </div>
  );
};

export default MainContentWrapper;
