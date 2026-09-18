import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureVideoThumbnail,
  clearThumbnailFailure,
  extractFrameFromVideoElement,
  getVideoStreamUrl,
  resetStreamInfoCache,
  saveThumbnailToDisk,
} from '../../src/services/videoThumbnailService';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

describe('videoThumbnailService', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    resetStreamInfoCache();
  });

  describe('getVideoStreamUrl', () => {
    it('constructs authenticated stream URL for root folder', async () => {
      mocks.invoke.mockResolvedValueOnce({
        token: 'secret-token',
        base_url: 'http://localhost:14201',
        operation_token: 'op-token-123',
      });

      const url = await getVideoStreamUrl(42, null);
      expect(url).toBe(
        'http://localhost:14201/stream/home/42?token=secret-token&credential=op-token-123'
      );
    });

    it('constructs stream URL for specific folder ID', async () => {
      mocks.invoke.mockResolvedValueOnce({
        token: 'tok-abc',
        base_url: 'http://localhost:14201',
        operation_token: null,
      });

      const url = await getVideoStreamUrl(99, 12345);
      expect(url).toBe('http://localhost:14201/stream/12345/99?token=tok-abc');
    });

    it('returns null if stream info fails', async () => {
      mocks.invoke.mockRejectedValueOnce(new Error('Server unavailable'));

      const url = await getVideoStreamUrl(1, null);
      expect(url).toBeNull();
    });
  });

  describe('captureVideoThumbnail validation', () => {
    it('returns null immediately for non-video filenames', async () => {
      const result = await captureVideoThumbnail(10, null, 'document.pdf');
      expect(result).toBeNull();
      expect(mocks.invoke).not.toHaveBeenCalled();
    });
  });

  describe('extractFrameFromVideoElement', () => {
    it('returns null when video dimensions are zero or invalid', () => {
      const video = document.createElement('video');
      Object.defineProperty(video, 'videoWidth', { value: 0 });
      Object.defineProperty(video, 'videoHeight', { value: 0 });

      const thumb = extractFrameFromVideoElement(video);
      expect(thumb).toBeNull();
    });

    it('returns data URL when video dimensions are valid', () => {
      const video = document.createElement('video');
      Object.defineProperty(video, 'videoWidth', { value: 1920 });
      Object.defineProperty(video, 'videoHeight', { value: 1080 });

      // Mock canvas getContext and toDataURL
      const mockDataUrl = 'data:image/jpeg;base64,mockframe';
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          const canvas = originalCreateElement('canvas');
          canvas.getContext = vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          } as unknown as CanvasRenderingContext2D);
          canvas.toDataURL = vi.fn().mockReturnValue(mockDataUrl);
          return canvas;
        }
        return originalCreateElement(tag);
      });

      const thumb = extractFrameFromVideoElement(video);
      expect(thumb).toBe(mockDataUrl);
    });
  });

  describe('saveThumbnailToDisk', () => {
    it('invokes cmd_save_thumbnail with correct arguments', async () => {
      mocks.invoke.mockResolvedValueOnce('/path/to/thumb.jpg');

      const path = await saveThumbnailToDisk(55, 999, 'data:image/jpeg;base64,abcd');
      expect(mocks.invoke).toHaveBeenCalledWith('cmd_save_thumbnail', {
        messageId: 55,
        folderId: 999,
        imageBase64: 'data:image/jpeg;base64,abcd',
      });
      expect(path).toBe('/path/to/thumb.jpg');
    });

    it('handles errors gracefully and returns null', async () => {
      mocks.invoke.mockRejectedValueOnce(new Error('Disk write failed'));

      const path = await saveThumbnailToDisk(55, null, 'data:image/jpeg;base64,abcd');
      expect(path).toBeNull();
    });
  });
});
