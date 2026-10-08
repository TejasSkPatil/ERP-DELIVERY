import React from 'react';
import { DailyStat } from '../../types/delivery';
import { TEMPLATE_ASSETS } from '../../assets';

interface DailyHistorySidebarProps {
  stats: DailyStat[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const DailyHistorySidebar: React.FC<DailyHistorySidebarProps> = ({
  stats,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <div className="col-sm-12 col-md-12 col-lg-4 col-xl-4 tm-recommended-container">
      <div className="tm-bg-white">
        <div className="tm-bg-primary tm-sidebar-pad">
          <h3 className="tm-color-white tm-sidebar-title">
            <i className="fa fa-calendar mr-2"></i> Daily Delivery Log
          </h3>
          <p className="tm-color-white tm-margin-b-0 tm-font-light">
            Latest 32 calendar days retention window (Asia/Kolkata)
          </p>
        </div>

        <div className="tm-sidebar-pad-2">
          {stats.map((stat, idx) => {
            const isSelected = stat.date === selectedDate;
            const thumbImg =
              TEMPLATE_ASSETS.thumbnails[idx % TEMPLATE_ASSETS.thumbnails.length];

            return (
              <a
                key={stat.date || idx}
                href="#filter-day"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectDate(stat.date);
                }}
                className="media tm-media tm-recommended-item"
                style={{
                  border: isSelected ? '2px solid #ee5057' : 'none',
                  textDecoration: 'none',
                  position: 'relative',
                }}
              >
                <img
                  src={thumbImg}
                  alt={`Thumbnail for ${stat.date}`}
                  style={{ width: '80px', height: '65px', objectFit: 'cover' }}
                />
                <div
                  className="media-body tm-media-body tm-bg-gray"
                  style={{
                    backgroundColor: isSelected ? '#fbe9ea' : undefined,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    paddingLeft: '18px',
                  }}
                >
                  <h4
                    className="text-uppercase tm-font-semibold tm-sidebar-item-title"
                    style={{
                      fontSize: '0.95rem',
                      color: isSelected ? '#ee5057' : 'black',
                    }}
                  >
                    {stat.date} {stat.isToday && <span style={{ color: '#ee5057' }}>(Today)</span>}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#898989' }}>
                    <strong style={{ color: '#ee5057' }}>{stat.totalDeliveries}</strong> Deliveries &bull;{' '}
                    {stat.uploadedSlips} Slips
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyHistorySidebar;
