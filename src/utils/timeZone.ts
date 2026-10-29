/**
 * Asia/Kolkata timezone utility for frontend display and timestamping
 */

export const getKolkataCurrentDate = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(date); // e.g. "16/10/2026"
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

/**
 * Formats any date string into standard DD/MM/YYYY format.
 * Examples:
 *  - "2026-10-16" -> "16/10/2026"
 *  - "16/10/2026" -> "16/10/2026"
 *  - "08 Oct 2026" -> "08/10/2026"
 *  - "2026-10-16T00:13:00.000Z" -> "16/10/2026"
 */
export const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr || !dateStr.trim()) return '-';
  const clean = dateStr.trim();

  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  // D/M/YYYY or DD/M/YYYY or D/MM/YYYY
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[1].padStart(2, '0')}/${slashMatch[2].padStart(2, '0')}/${slashMatch[3]}`;
  }

  // DD-MM-YYYY
  const dmyDashMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyDashMatch) {
    return `${dmyDashMatch[1].padStart(2, '0')}/${dmyDashMatch[2].padStart(2, '0')}/${dmyDashMatch[3]}`;
  }

  // YYYY-MM-DD (including ISO strings like YYYY-MM-DDTHH:mm:ss)
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[3].padStart(2, '0')}/${ymdMatch[2].padStart(2, '0')}/${ymdMatch[1]}`;
  }

  // DD Mon YYYY (e.g. "08 Oct 2026")
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dMonYMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (dMonYMatch) {
    const day = dMonYMatch[1].padStart(2, '0');
    const month = months[dMonYMatch[2].toLowerCase()] || '01';
    const year = dMonYMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Fallback: parse using Date
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return clean;
};
