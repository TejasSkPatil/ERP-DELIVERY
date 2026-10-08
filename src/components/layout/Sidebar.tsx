import React, { ReactNode } from 'react';

export interface SidebarItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  items?: SidebarItem[];
  children?: ReactNode;
  id?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  title,
  subtitle,
  items,
  children,
  id,
}) => {
  return (
    <aside className="col-sm-12 col-md-12 col-lg-4 col-xl-4 tm-recommended-container" id={id}>
      <div className="tm-bg-white tm-bg-white-shadow">
        {/* Coral Title Bar */}
        <div className="tm-bg-primary tm-sidebar-pad">
          <h3 className="tm-color-white tm-sidebar-title" style={{ fontSize: '1.3rem' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="tm-color-white tm-margin-b-0 tm-font-light" style={{ fontSize: '0.85rem' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="tm-sidebar-pad-2">
          {items &&
            items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (item.onClick) item.onClick();
                }}
                className="media tm-media tm-recommended-item"
                style={{
                  border: item.active ? '2px solid #ee5057' : 'none',
                  textDecoration: 'none',
                  position: 'relative',
                  marginBottom: '15px',
                  display: 'flex',
                }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{ width: '80px', height: '65px', objectFit: 'cover' }}
                  />
                )}
                <div
                  className="media-body tm-media-body tm-bg-gray"
                  style={{
                    backgroundColor: item.active ? '#fbe9ea' : undefined,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingLeft: '18px',
                    display: 'flex',
                  }}
                >
                  <h4
                    className="text-uppercase tm-font-semibold tm-sidebar-item-title"
                    style={{
                      fontSize: '0.95rem',
                      color: item.active ? '#ee5057' : 'black',
                    }}
                  >
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <span style={{ fontSize: '0.8rem', color: '#898989' }}>
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </a>
            ))}
          {children}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
