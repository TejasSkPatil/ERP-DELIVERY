/**
 * Asia/Kolkata timezone utility for frontend display and timestamping
 */

export const getKolkataCurrentDate = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return formatter.format(date); // e.g. "08 Oct 2026"
};

export const getKolkataCurrentTime = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatter.format(date)} IST`; // e.g. "14:32:15 IST"
};

export const getKolkataFormattedTimestamp = (date: Date = new Date()) => {
  return {
    deliveryDate: getKolkataCurrentDate(date),
    uploadedTime: getKolkataCurrentTime(date),
  };
};
