import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatAuthors(authors: { name: string }[], max = 3): string {
  if (!authors || authors.length === 0) return 'Unknown';
  if (authors.length <= max) return authors.map(a => a.name).join(', ');
  return `${authors.slice(0, max).map(a => a.name).join(', ')} et al.`;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
