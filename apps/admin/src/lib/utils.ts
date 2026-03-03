import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fated_access_token');
}

export function clearSession() {
  localStorage.removeItem('fated_access_token');
  localStorage.removeItem('fated_refresh_token');
}
