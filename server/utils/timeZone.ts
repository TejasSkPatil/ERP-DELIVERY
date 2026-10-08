// Timezone utility strictly configured for Asia/Kolkata

export const getKolkataDateInfo = (date: Date = new Date()) => {
  // Format Date in Asia/Kolkata
  const formatterDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formatterTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const deliveryDate = formatterDate.format(date); // e.g., "07 Oct 2026"
  const uploadedTime = `${formatterTime.format(date)} IST`; // e.g., "14:32:15 IST"

  return { deliveryDate, uploadedTime };
};

export const get32DayCutoffDate = (): Date => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 32);
  return cutoff;
};
