import { describe, expect, it } from 'vitest';
import {
  isImageFile,
  isVideoFile,
  isPdfFile,
  isTextOrDocFile,
} from '../../src/utils/files';
import type { TelegramFile } from '../../src/types';

describe('Home Screen Media & Folder Filtering', () => {
  const sampleFiles: TelegramFile[] = [
    {
      id: 1,
      name: 'vacation.jpg',
      size: 1024,
      sizeStr: '1 KB',
      type: 'file',
      folder_id: undefined, // Saved Messages
      mime_type: 'image/jpeg',
    },
    {
      id: 2,
      name: 'movie.mp4',
      size: 1024 * 1024 * 50,
      sizeStr: '50 MB',
      type: 'file',
      folder_id: undefined, // Saved Messages
      mime_type: 'video/mp4',
    },
    {
      id: 3,
      name: 'contract.pdf',
      size: 50000,
      sizeStr: '48.8 KB',
      type: 'file',
      folder_id: 101, // Folder 101 (Work)
      mime_type: 'application/pdf',
    },
    {
      id: 4,
      name: 'notes.txt',
      size: 200,
      sizeStr: '200 Bytes',
      type: 'file',
      folder_id: 101, // Folder 101 (Work)
      mime_type: 'text/plain',
    },
    {
      id: 5,
      name: 'archive.zip',
      size: 20480,
      sizeStr: '20 KB',
      type: 'file',
      folder_id: 102, // Folder 102 (Backups)
      mime_type: 'application/zip',
    },
    {
      id: 6,
      name: 'app.apk',
      size: 15000000,
      sizeStr: '14.3 MB',
      type: 'file',
      folder_id: 102, // Folder 102 (Backups)
      mime_type: 'application/vnd.android.package-archive',
    },
  ];

  const isDocFile = (name: string, mime?: string | null) => {
    const ext = name.replace(/\.tdenc$/i, '').split('.').pop()?.toLowerCase() || '';
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'csv', 'tsv', 'md'];
    const lowerMime = mime?.toLowerCase() || '';
    return isPdfFile(name) || isTextOrDocFile(name) || docExts.includes(ext) || lowerMime.includes('document') || lowerMime.includes('pdf') || lowerMime.includes('sheet') || lowerMime.includes('presentation') || lowerMime.includes('text/');
  };

  const filterFiles = (
    files: TelegramFile[],
    folderFilter: 'all' | 'saved' | number,
    mediaFilter: 'all' | 'images' | 'videos' | 'docs' | 'other'
  ) => {
    let result = files;
    if (folderFilter === 'saved') {
      result = result.filter(f => f.folder_id == null);
    } else if (typeof folderFilter === 'number') {
      result = result.filter(f => f.folder_id === folderFilter);
    }

    if (mediaFilter === 'images') {
      result = result.filter(f => isImageFile(f.name, f.mime_type));
    } else if (mediaFilter === 'videos') {
      result = result.filter(f => isVideoFile(f.name, f.mime_type));
    } else if (mediaFilter === 'docs') {
      result = result.filter(f => isDocFile(f.name, f.mime_type));
    } else if (mediaFilter === 'other') {
      result = result.filter(f => !isImageFile(f.name, f.mime_type) && !isVideoFile(f.name, f.mime_type) && !isDocFile(f.name, f.mime_type));
    }
    return result;
  };

  it('filters all files across all folders by default', () => {
    const all = filterFiles(sampleFiles, 'all', 'all');
    expect(all.length).toBe(6);
  });

  it('filters to Saved Messages when saved is selected', () => {
    const saved = filterFiles(sampleFiles, 'saved', 'all');
    expect(saved.map(f => f.id)).toEqual([1, 2]);
  });

  it('filters to a specific folder by ID', () => {
    const workFiles = filterFiles(sampleFiles, 101, 'all');
    expect(workFiles.map(f => f.id)).toEqual([3, 4]);
  });

  it('filters images only', () => {
    const images = filterFiles(sampleFiles, 'all', 'images');
    expect(images.map(f => f.id)).toEqual([1]);
  });

  it('filters videos only', () => {
    const videos = filterFiles(sampleFiles, 'all', 'videos');
    expect(videos.map(f => f.id)).toEqual([2]);
  });

  it('filters documents only', () => {
    const docs = filterFiles(sampleFiles, 'all', 'docs');
    expect(docs.map(f => f.id)).toEqual([3, 4]);
  });

  it('filters other files only', () => {
    const other = filterFiles(sampleFiles, 'all', 'other');
    expect(other.map(f => f.id)).toEqual([5, 6]);
  });

  it('combines folder and media filters accurately', () => {
    const workDocs = filterFiles(sampleFiles, 101, 'docs');
    expect(workDocs.map(f => f.id)).toEqual([3, 4]);

    const workImages = filterFiles(sampleFiles, 101, 'images');
    expect(workImages.length).toBe(0);

    const backupOther = filterFiles(sampleFiles, 102, 'other');
    expect(backupOther.map(f => f.id)).toEqual([5, 6]);
  });
});

describe('Double-Back Exit Contract', () => {
  it('returns true on first press and false when pressed again within 2000ms', () => {
    let lastBackPress = 0;

    const handleDoubleBack = (now: number): boolean => {
      if (lastBackPress > 0 && now - lastBackPress < 2000) {
        return false; // Exit app
      }
      lastBackPress = now;
      return true; // Toast shown, wait for second press
    };

    // First press at t=1000
    expect(handleDoubleBack(1000)).toBe(true);
    expect(lastBackPress).toBe(1000);

    // Second press at t=1800 (800ms later, within 2s)
    expect(handleDoubleBack(1800)).toBe(false);

    // If next press is at t=5000 (3.2s later, outside 2s window)
    expect(handleDoubleBack(5000)).toBe(true);
    expect(lastBackPress).toBe(5000);

    // Another press at t=5500 (500ms later, within 2s)
    expect(handleDoubleBack(5500)).toBe(false);
  });
});

describe('AutoBackupSheet Back Precedence and Sub-Modal Hierarchy', () => {
  it('dismisses AutoBackupSheet before falling back to settingsSubpage or tab navigation', () => {
    let showAutoBackupSheet = true;
    let settingsSubpage: string | null = 'autobackup';
    let activeTab = 'settings';

    const handleBack = (): boolean => {
      // 1. Modals & Dialogs
      if (showAutoBackupSheet) {
        showAutoBackupSheet = false;
        return true;
      }
      // 2. Settings subpages
      if (settingsSubpage !== null) {
        settingsSubpage = null;
        return true;
      }
      // 3. Tab navigation
      if (activeTab !== 'home') {
        activeTab = 'home';
        return true;
      }
      return false;
    };

    // First back press: closes AutoBackupSheet, leaves subpage & activeTab intact
    expect(handleBack()).toBe(true);
    expect(showAutoBackupSheet).toBe(false);
    expect(settingsSubpage).toBe('autobackup');
    expect(activeTab).toBe('settings');

    // Second back press: closes settings subpage
    expect(handleBack()).toBe(true);
    expect(settingsSubpage).toBeNull();
    expect(activeTab).toBe('settings');

    // Third back press: navigates back to home tab
    expect(handleBack()).toBe(true);
    expect(activeTab).toBe('home');
  });

  it('closes internal sub-modals before closing AutoBackup screen', () => {
    let configuringPreset: string | null = 'DCIM/Camera';
    let showAddCustom = false;
    let editingPair: number | null = null;
    let isSheetClosed = false;

    const handleAutoBackupBack = (): boolean => {
      if (configuringPreset !== null) {
        configuringPreset = null;
        return true;
      }
      if (showAddCustom) {
        showAddCustom = false;
        return true;
      }
      if (editingPair !== null) {
        editingPair = null;
        return true;
      }
      isSheetClosed = true;
      return true;
    };

    // First back press: closes configuring preset dialog
    expect(handleAutoBackupBack()).toBe(true);
    expect(configuringPreset).toBeNull();
    expect(isSheetClosed).toBe(false);

    // Second back press: closes the screen itself
    expect(handleAutoBackupBack()).toBe(true);
    expect(isSheetClosed).toBe(true);
  });
});
