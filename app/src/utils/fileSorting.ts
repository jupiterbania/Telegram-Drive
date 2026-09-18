import type { TelegramFile } from '../types';

export type SortField = 'date' | 'name' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface SortOptionDescriptor {
  id: string;
  field: SortField;
  direction: SortDirection;
  labelKey: string;
  fallbackLabel: string;
}

export const SORT_OPTIONS: readonly SortOptionDescriptor[] = [
  {
    id: 'date_desc',
    field: 'date',
    direction: 'desc',
    labelKey: 'sorting.recent_first',
    fallbackLabel: 'Recent uploads (Newest first)',
  },
  {
    id: 'date_asc',
    field: 'date',
    direction: 'asc',
    labelKey: 'sorting.oldest_first',
    fallbackLabel: 'Oldest first',
  },
  {
    id: 'name_asc',
    field: 'name',
    direction: 'asc',
    labelKey: 'sorting.name_asc',
    fallbackLabel: 'Name (A to Z)',
  },
  {
    id: 'name_desc',
    field: 'name',
    direction: 'desc',
    labelKey: 'sorting.name_desc',
    fallbackLabel: 'Name (Z to A)',
  },
  {
    id: 'size_desc',
    field: 'size',
    direction: 'desc',
    labelKey: 'sorting.size_desc',
    fallbackLabel: 'Size (Largest first)',
  },
  {
    id: 'size_asc',
    field: 'size',
    direction: 'asc',
    labelKey: 'sorting.size_asc',
    fallbackLabel: 'Size (Smallest first)',
  },
] as const;

export function getActiveSortDescriptor(
  field: SortField,
  direction: SortDirection
): SortOptionDescriptor {
  const match = SORT_OPTIONS.find((opt) => opt.field === field && opt.direction === direction);
  return (
    match || {
      id: `${field}_${direction}`,
      field,
      direction,
      labelKey: 'sorting.recent_first',
      fallbackLabel: 'Recent uploads (Newest first)',
    }
  );
}

export function parseFileDate(file: TelegramFile): number {
  if (file.created_at) {
    const parsed = Date.parse(file.created_at);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const num = Number(file.created_at);
    if (!isNaN(num) && num > 0) {
      return num > 1e11 ? num : num * 1000;
    }
  }
  // Telegram message IDs are monotonic, preserving chronological upload order
  return file.id ? file.id * 1000 : 0;
}

export function sortTelegramFiles(
  files: TelegramFile[],
  field: SortField = 'date',
  direction: SortDirection = 'desc',
  language: string = 'system'
): TelegramFile[] {
  const locale = !language || language === 'system' ? undefined : language;
  return [...files].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'date': {
        const timeA = parseFileDate(a);
        const timeB = parseFileDate(b);
        comparison = timeA - timeB;
        if (comparison === 0) {
          comparison = (a.id || 0) - (b.id || 0);
        }
        break;
      }
      case 'name': {
        comparison = a.name.localeCompare(b.name, locale, {
          numeric: true,
          sensitivity: 'base',
        });
        if (comparison === 0) {
          comparison = (a.id || 0) - (b.id || 0);
        }
        break;
      }
      case 'size': {
        comparison = (a.size || 0) - (b.size || 0);
        if (comparison === 0) {
          comparison = (a.id || 0) - (b.id || 0);
        }
        break;
      }
    }
    return direction === 'asc' ? comparison : -comparison;
  });
}
