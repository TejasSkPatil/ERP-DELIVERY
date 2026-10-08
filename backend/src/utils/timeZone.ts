export const getKolkataDateInfo = (date: Date = new Date()) => {
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return {
    deliveryDate: dateFormatter.format(date), // e.g. "08 Oct 2026"
    uploadedTime: `${timeFormatter.format(date)} IST`, // e.g. "14:32:15 IST"
  };
};

export const get32DayCutoffDate = (retentionDays = 32): Date => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return cutoff;
};
