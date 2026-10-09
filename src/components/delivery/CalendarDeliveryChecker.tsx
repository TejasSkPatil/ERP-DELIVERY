import React, { useState, useMemo } from 'react';
import { DeliveryRecord, DeliveryPersonStat } from '../../types/delivery';
import { Table, Column, Badge, Button } from '../ui';
import { getKolkataCurrentDate } from '../../utils/timeZone';

interface CalendarDeliveryCheckerProps {
  deliveries: DeliveryRecord[];
  agents?: DeliveryPersonStat[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onViewSlip: (delivery: DeliveryRecord) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Helper: Parse "08 Oct 2026" into Date object
const parseFormattedDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.trim().split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthIdx = MONTH_SHORT.indexOf(parts[1]);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
      return new Date(year, monthIdx, day);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

// Helper: Format Date object to "08 Oct 2026"
const formatDateToKolkata = (date: Date): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = MONTH_SHORT[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
};

// Helper: Format Date object to YYYY-MM-DD for <input type="date">
const formatDateToIsoInput = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const CalendarDeliveryChecker: React.FC<CalendarDeliveryCheckerProps> = ({
  deliveries,
  agents = [],
  selectedDate,
  onSelectDate,
  onViewSlip,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Current calendar viewing month and year
  const initialDate = useMemo(() => parseFormattedDate(selectedDate), [selectedDate]);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Count deliveries per date for highlighting in calendar
  const deliveryCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    deliveries.forEach((d) => {
      const dateKey = d.deliveryDate;
      if (dateKey) {
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      }
    });
    return counts;
  }, [deliveries]);

  // Unique list of dates present in deliveries
  const availableDates = useMemo(() => {
    const unique = Array.from(new Set(deliveries.map((d) => d.deliveryDate).filter(Boolean)));
    return unique;
  }, [deliveries]);

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate calendar days for current viewMonth and viewYear
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      deliveryCount: number;
      isSelected: boolean;
    }> = [];

    // Empty padding slots for days before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dayNumber: 0,
        dateString: '',
        isCurrentMonth: false,
        deliveryCount: 0,
        isSelected: false,
      });
    }

    // Days of month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const thisDate = new Date(viewYear, viewMonth, d);
      const dateStr = formatDateToKolkata(thisDate);
      days.push({
        dayNumber: d,
        dateString: dateStr,
        isCurrentMonth: true,
        deliveryCount: deliveryCountByDate[dateStr] || 0,
        isSelected: dateStr === selectedDate,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, deliveryCountByDate]);

  // Handle clicking a calendar cell
  const handleDayClick = (dateStr: string) => {
    if (!dateStr) return;
    onSelectDate(dateStr);
    setIsCalendarOpen(false);
  };

  // Handle HTML5 native date picker change
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // "YYYY-MM-DD"
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    const chosen = new Date(y, m - 1, d);
    const formatted = formatDateToKolkata(chosen);
    setViewYear(y);
    setViewMonth(m - 1);
    onSelectDate(formatted);
  };

  // Filter deliveries by selectedDate, selectedPerson, and searchTerm
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((item) => {
      // 1. Filter by date
      if (selectedDate && item.deliveryDate !== selectedDate) {
        return false;
      }

      // 2. Filter by person
      if (selectedPerson !== 'ALL') {
        const itemPerson = item.deliveryPerson || '';
        const itemPersonId = item.deliveryPersonId || '';
        if (
          !itemPerson.toLowerCase().includes(selectedPerson.toLowerCase()) &&
          itemPersonId !== selectedPerson
        ) {
          return false;
        }
      }

      // 3. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const rNo = item.receiptNo.toLowerCase();
        const recipient = (item.recipientName || item.customer || '').toLowerCase();
        const dp = (item.deliveryPerson || '').toLowerCase();
        return rNo.includes(term) || recipient.includes(term) || dp.includes(term);
      }

      return true;
    });
  }, [deliveries, selectedDate, selectedPerson, searchTerm]);

  // Delivery table columns
  const columns: Column<DeliveryRecord>[] = [
    {
      key: 'receiptNo',
      header: 'Receipt No.',
      render: (row) => (
        <span style={{ fontWeight: 700, color: '#ee5057', fontSize: '1rem' }}>
          #{row.receiptNo}
        </span>
      ),
    },
    {
      key: 'deliveryPerson',
      header: 'Delivery Boy',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#1f3646' }}>
            <i className="fa fa-motorcycle mr-1 tm-color-primary"></i>
            {row.deliveryPerson || 'Bhushan Lokhande (DP-01)'}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Recipient Information',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#333' }}>
            <i className="fa fa-map-marker mr-1 tm-color-primary"></i>
            {row.recipientName || row.customer || 'Standard Recipient'}
          </div>
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Delivery Date',
      render: (row) => (
        <span className="badge badge-light" style={{ fontSize: '0.82rem', padding: '5px 8px' }}>
          <i className="fa fa-calendar-o mr-1"></i>
          {row.deliveryDate}
        </span>
      ),
    },
    {
      key: 'uploadedTime',
      header: 'Uploaded Time',
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#1f3646' }}>
          {row.uploadedTime || '12:00:00 IST'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'Completed' || row.status === 'DELIVERED' ? 'success' : 'warning'} icon="fa-check">
          {row.status || 'DELIVERED'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Proof Slip',
      align: 'center',
      render: (row) => (
        <Button
          variant="primary"
          size="sm"
          icon="fa-eye"
          onClick={() => onViewSlip(row)}
        >
          View Slip
        </Button>
      ),
    },
  ];

  return (
    <div className="col-12" id="delivery-calendar-checker-wrapper">
      {/* 1. Interactive Calendar & Person Checker Control Panel */}
      <div
        className="tm-bg-white mb-4"
        style={{
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid #eaeaea',
        }}
      >
        {/* Top Control Bar */}
        <div
          className="tm-bg-primary text-white p-3 d-flex flex-wrap align-items-center justify-content-between"
          style={{ gap: '12px' }}
        >
          <div className="d-flex align-items-center" style={{ gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              <i className="fa fa-calendar"></i>
            </div>
            <div>
              <h4 className="m-0 text-white font-weight-bold" style={{ fontSize: '1.15rem' }}>
                Delivery Calendar &amp; Delivery Boy Checker
              </h4>
              <p
                className="m-0"
                style={{
                  fontSize: '0.82rem',
                  color: '#000000',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                Open calendar &bull; Click any date &bull; Filter by delivery person to see that day&apos;s deliveries
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
            {/* Open / Close Calendar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="btn btn-light font-weight-bold d-flex align-items-center"
              style={{
                fontSize: '0.85rem',
                color: '#ee5057',
                padding: '7px 16px',
                borderRadius: '4px',
                border: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
            >
              <i className={`fa ${isCalendarOpen ? 'fa-times' : 'fa-calendar-check-o'} mr-2`}></i>
              {isCalendarOpen ? 'Close Calendar' : 'Open Calendar'}
            </button>

            {/* Native Date Picker Shortcut */}
            <div className="d-flex align-items-center bg-white rounded px-2" style={{ height: '36px' }}>
              <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '6px' }}>Pick:</span>
              <input
                type="date"
                value={formatDateToIsoInput(parseFormattedDate(selectedDate))}
                onChange={handleNativeDateChange}
                aria-label="Select delivery calendar date"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.8rem',
                  color: '#1f3646',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Interactive Calendar Dropdown / Widget Section */}
        {isCalendarOpen && (
          <div
            className="p-3 tm-bg-gray border-bottom"
            style={{
              backgroundColor: '#fafafa',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div className="row justify-content-center">
              <div className="col-12 col-md-8 col-lg-6">
                <div
                  className="bg-white p-3 rounded"
                  style={{
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  {/* Calendar Month Navigation Header */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="btn btn-sm btn-outline-secondary"
                      style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                      aria-label="Previous Month"
                    >
                      <i className="fa fa-chevron-left"></i>
                    </button>

                    <h5 className="m-0 font-weight-bold" style={{ color: '#1f3646' }}>
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </h5>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="btn btn-sm btn-outline-secondary"
                      style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                      aria-label="Next Month"
                    >
                      <i className="fa fa-chevron-right"></i>
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: '#888',
                      marginBottom: '8px',
                    }}
                  >
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Calendar Days Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                    }}
                  >
                    {calendarDays.map((cell, idx) => {
                      if (!cell.isCurrentMonth) {
                        return <div key={`empty-${idx}`} style={{ minHeight: '44px' }}></div>;
                      }

                      const hasDeliveries = cell.deliveryCount > 0;
                      const isSelected = cell.isSelected;

                      return (
                        <button
                          key={cell.dateString}
                          type="button"
                          onClick={() => handleDayClick(cell.dateString)}
                          style={{
                            minHeight: '46px',
                            border: isSelected ? '2px solid #ee5057' : '1px solid #eee',
                            borderRadius: '4px',
                            backgroundColor: isSelected
                              ? '#ee5057'
                              : hasDeliveries
                              ? '#fff5f5'
                              : '#ffffff',
                            color: isSelected ? '#ffffff' : hasDeliveries ? '#ee5057' : '#333',
                            fontWeight: isSelected || hasDeliveries ? 700 : 400,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: '2px',
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{cell.dayNumber}</span>
                          {hasDeliveries && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '1px 4px',
                                borderRadius: '8px',
                                backgroundColor: isSelected ? '#ffffff' : '#ee5057',
                                color: isSelected ? '#ee5057' : '#ffffff',
                                marginTop: '1px',
                                lineHeight: '1',
                              }}
                            >
                              {cell.deliveryCount} {cell.deliveryCount === 1 ? 'del' : 'dels'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-top d-flex justify-content-between align-items-center" style={{ fontSize: '0.78rem', color: '#666' }}>
                    <div>
                      <span className="badge badge-danger mr-1" style={{ backgroundColor: '#ee5057' }}>●</span> Has Deliveries
                    </div>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      style={{ color: '#ee5057', fontSize: '0.78rem' }}
                      onClick={() => {
                        const todayStr = getKolkataCurrentDate();
                        onSelectDate(todayStr);
                        setIsCalendarOpen(false);
                      }}
                    >
                      Select Today ({getKolkataCurrentDate()})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Date Quick Select Bar & Delivery Boy Filter Bar */}
        <div
          className="p-3 bg-light border-bottom d-flex flex-wrap align-items-center justify-content-between"
          style={{ gap: '15px' }}
        >
          {/* Quick Date Chips */}
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginRight: '4px' }}>
              <i className="fa fa-clock-o mr-1"></i> Quick Dates:
            </span>
            {availableDates.slice(0, 6).map((dStr) => {
              const isCurrent = dStr === selectedDate;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => onSelectDate(dStr)}
                  className={`btn btn-sm ${isCurrent ? 'btn-danger' : 'btn-outline-secondary'}`}
                  style={{
                    fontSize: '0.78rem',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    backgroundColor: isCurrent ? '#ee5057' : 'transparent',
                    borderColor: isCurrent ? '#ee5057' : '#ccc',
                    color: isCurrent ? '#fff' : '#333',
                    fontWeight: isCurrent ? 700 : 500,
                  }}
                >
                  {dStr} {deliveryCountByDate[dStr] ? `(${deliveryCountByDate[dStr]})` : ''}
                </button>
              );
            })}
          </div>

          {/* CHECK PERSON DELIVERY Filter Dropdown */}
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
            <label
              htmlFor="delivery-person-filter-select"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1f3646',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <i className="fa fa-user-circle-o tm-color-primary mr-1"></i>
              Check Person Delivery:
            </label>
            <select
              id="delivery-person-filter-select"
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="form-control form-control-sm"
              style={{
                minWidth: '200px',
                height: '34px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1f3646',
                borderColor: '#ccc',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Delivery Boys ({deliveries.length} total)</option>
              <option value="Bhushan Lokhande">
                Bhushan Lokhande (DP-01)
              </option>
              {agents
                .filter((a) => !a.name.includes('Bhushan Lokhande'))
                .map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 4. Active Selection Banner */}
        <div
          className="p-3 d-flex flex-wrap align-items-center justify-content-between"
          style={{ backgroundColor: '#fff8f8', borderBottom: '1px solid #f1dede' }}
        >
          <div>
            <span style={{ fontSize: '0.9rem', color: '#1f3646' }}>
              Showing Deliveries for Date: <strong style={{ color: '#ee5057' }}>{selectedDate}</strong>
              {selectedPerson !== 'ALL' && (
                <> &bull; Filtered by Delivery Boy: <strong>{selectedPerson}</strong></>
              )}
            </span>
          </div>
          <div>
            <span
              className="badge"
              style={{
                backgroundColor: '#ee5057',
                color: '#ffffff',
                padding: '6px 12px',
                fontSize: '0.82rem',
                borderRadius: '4px',
              }}
            >
              <i className="fa fa-truck mr-1"></i> {filteredDeliveries.length} Completed Orders
            </span>
          </div>
        </div>
      </div>

      {/* 5. Deliveries Data Table Component (Full Width, NO ASIDE) */}
      <div
        className="tm-bg-white"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '30px',
        }}
      >
        <Table
          columns={columns}
          data={filteredDeliveries}
          keyExtractor={(row) => row.id}
          title={`Delivery Records for ${selectedDate}`}
          subtitle={`Verified delivery log & GridFS proof slips for ${selectedDate}${
            selectedPerson !== 'ALL' ? ` (Assigned to ${selectedPerson})` : ''
          }`}
          headerAction={
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <i
                className="fa fa-search tm-form-element-icon"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  color: '#ee5057',
                }}
              ></i>
              <input
                type="text"
                className="form-control"
                placeholder="Search Receipt # or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: '38px',
                  height: '42px',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          }
          emptyMessage={`No deliveries found for ${selectedDate}${
            selectedPerson !== 'ALL' ? ` by ${selectedPerson}` : ''
          }. Open the calendar above to pick another date!`}
        />
      </div>
    </div>
  );
};

export default CalendarDeliveryChecker;
