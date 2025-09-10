import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name = '') => {
  if (!name) return '';
  const nameParts = name.trim().split(' ');
  if (nameParts.length > 1) {
    const firstInitial = nameParts[0][0] || '';
    const lastInitial = nameParts[nameParts.length - 1][0] || '';
    return `${firstInitial}${lastInitial}`;
  }
  return name.substring(0, 2);
}
