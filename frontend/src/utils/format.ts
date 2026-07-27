export const formatNumber = (n: number | string | null | undefined, fractionDigits = 0): string => {
  if (n === null || n === undefined || n === '') return '0';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(num);
};

export const formatPercent = (n: number | null | undefined, fractionDigits = 1): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '0%';
  return `${formatNumber(n, fractionDigits)}%`;
};

export const formatDate = (d: string | Date | null | undefined, withTime = false): string => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  } as const;
  if (withTime) {
    return date.toLocaleString('en-KE', {
      ...options,
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('en-KE', options);
};

export const getInitials = (name: string): string => {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p ? p[0]?.toUpperCase() ?? '' : ''))
    .join('') || 'U';
};

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const pluralize = (n: number, s: string, p?: string): string =>
  `${formatNumber(n)} ${n === 1 ? s : p ?? `${s}s`}`;

export const daysBetween = (a: Date | string, b: Date | string) => {
  const d1 = typeof a === 'string' ? new Date(a) : a;
  const d2 = typeof b === 'string' ? new Date(b) : b;
  return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
};
