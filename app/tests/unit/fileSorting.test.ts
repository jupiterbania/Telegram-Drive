import { describe, expect, it } from 'vitest';
import type { TelegramFile } from '../../src/types';
import {
  parseFileDate,
  sortTelegramFiles,
  getActiveSortDescriptor,
  SORT_OPTIONS,
} from '../../src/utils/fileSorting';

const mockFile = (partial: Partial<TelegramFile>): TelegramFile => ({
  id: 1,
  name: 'file.txt',
  size: 1024,
  sizeStr: '1 KB',
  ...partial,
});

describe('fileSorting utility', () => {
  it('parses valid ISO dates and handles fallbacks to message id', () => {
    const fileWithIso = mockFile({ id: 10, created_at: '2026-09-12T10:00:00Z' });
    const fileWithUnix = mockFile({ id: 20, created_at: '1726135200' });
    const fileWithNoDate = mockFile({ id: 30 });

    expect(parseFileDate(fileWithIso)).toBe(Date.parse('2026-09-12T10:00:00Z'));
    expect(parseFileDate(fileWithUnix)).toBe(1726135200 * 1000);
    expect(parseFileDate(fileWithNoDate)).toBe(30 * 1000);
  });

  it('sorts recent uploads to the top by default (date desc)', () => {
    const older = mockFile({ id: 101, name: 'old.pdf', created_at: '2026-09-01T12:00:00Z' });
    const newer = mockFile({ id: 102, name: 'new.pdf', created_at: '2026-09-10T12:00:00Z' });
    const newest = mockFile({ id: 103, name: 'latest.pdf', created_at: '2026-09-12T12:00:00Z' });

    const sorted = sortTelegramFiles([older, newest, newer], 'date', 'desc');
    expect(sorted.map((f) => f.name)).toEqual(['latest.pdf', 'new.pdf', 'old.pdf']);
  });

  it('breaks ties using message id descending so newer telegram uploads stay on top', () => {
    const upload1 = mockFile({ id: 50, name: 'first.mp4', created_at: '2026-09-12T12:00:00Z' });
    const upload2 = mockFile({ id: 55, name: 'second.mp4', created_at: '2026-09-12T12:00:00Z' });
    const upload3 = mockFile({ id: 60, name: 'third.mp4', created_at: '2026-09-12T12:00:00Z' });

    const sorted = sortTelegramFiles([upload1, upload3, upload2], 'date', 'desc');
    expect(sorted.map((f) => f.id)).toEqual([60, 55, 50]);
  });

  it('sorts oldest uploads first when requested (date asc)', () => {
    const older = mockFile({ id: 1, name: 'old.pdf', created_at: '2026-01-01T00:00:00Z' });
    const newer = mockFile({ id: 2, name: 'new.pdf', created_at: '2026-09-01T00:00:00Z' });

    const sorted = sortTelegramFiles([newer, older], 'date', 'asc');
    expect(sorted.map((f) => f.name)).toEqual(['old.pdf', 'new.pdf']);
  });

  it('sorts alphabetically by name (asc and desc)', () => {
    const alpha = mockFile({ id: 1, name: 'alpha.txt' });
    const beta = mockFile({ id: 2, name: 'beta.txt' });
    const gamma = mockFile({ id: 3, name: 'gamma.txt' });

    const asc = sortTelegramFiles([gamma, alpha, beta], 'name', 'asc');
    expect(asc.map((f) => f.name)).toEqual(['alpha.txt', 'beta.txt', 'gamma.txt']);

    const desc = sortTelegramFiles([alpha, gamma, beta], 'name', 'desc');
    expect(desc.map((f) => f.name)).toEqual(['gamma.txt', 'beta.txt', 'alpha.txt']);
  });

  it('sorts by size (desc and asc)', () => {
    const small = mockFile({ id: 1, name: 'small.txt', size: 100 });
    const medium = mockFile({ id: 2, name: 'medium.txt', size: 5000 });
    const large = mockFile({ id: 3, name: 'large.txt', size: 100000 });

    const largestFirst = sortTelegramFiles([medium, small, large], 'size', 'desc');
    expect(largestFirst.map((f) => f.name)).toEqual(['large.txt', 'medium.txt', 'small.txt']);

    const smallestFirst = sortTelegramFiles([medium, small, large], 'size', 'asc');
    expect(smallestFirst.map((f) => f.name)).toEqual(['small.txt', 'medium.txt', 'large.txt']);
  });

  it('retrieves active sort descriptor correctly', () => {
    const recent = getActiveSortDescriptor('date', 'desc');
    expect(recent.id).toBe('date_desc');
    expect(recent.fallbackLabel).toContain('Recent');

    const nameAsc = getActiveSortDescriptor('name', 'asc');
    expect(nameAsc.id).toBe('name_asc');

    expect(SORT_OPTIONS).toHaveLength(6);
  });
});
