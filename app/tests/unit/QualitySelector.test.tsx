import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QualitySelector } from '../../src/components/shared/QualitySelector';

describe('QualitySelector', () => {
    it('renders mobile trigger button with current quality', () => {
        render(
            <QualitySelector
                currentQuality="720p"
                onChange={vi.fn()}
                adaptiveMode={false}
                onToggleAdaptive={vi.fn()}
            />
        );

        const trigger = screen.getByRole('button', { name: /select video playback quality/i });
        expect(trigger).toBeDefined();
        expect(trigger.textContent).toContain('720p');
    });

    it('displays Auto on mobile trigger when adaptive mode is enabled', () => {
        render(
            <QualitySelector
                currentQuality="720p"
                onChange={vi.fn()}
                adaptiveMode={true}
                onToggleAdaptive={vi.fn()}
            />
        );

        const trigger = screen.getByRole('button', { name: /select video playback quality/i });
        expect(trigger.textContent).toContain('Auto');
    });

    it('opens mobile bottom sheet on clicking trigger badge and allows selecting quality', () => {
        const onChange = vi.fn();
        const onToggleAdaptive = vi.fn();

        render(
            <QualitySelector
                currentQuality="720p"
                onChange={onChange}
                adaptiveMode={true}
                onToggleAdaptive={onToggleAdaptive}
                transcodeCapabilities={{ available: true, variants: [], mode: 'hls' }}
            />
        );

        const trigger = screen.getByRole('button', { name: /select video playback quality/i });
        fireEvent.click(trigger);

        // Check that bottom sheet header is visible
        expect(screen.getByText('Video Quality')).toBeDefined();

        // Check options are rendered
        expect(screen.getByText('Auto (Adaptive)')).toBeDefined();
        expect(screen.getByText('Original Quality')).toBeDefined();

        // Click on 480p in the bottom sheet
        const p480Buttons = screen.getAllByRole('button').filter(b => b.textContent?.includes('480p'));
        // Find the one in the mobile sheet (has "SD • 1.0 Mbps" in text or child)
        const mobile480Button = p480Buttons.find(b => b.textContent?.includes('480p') && b.textContent?.includes('SD'));
        expect(mobile480Button).toBeDefined();

        fireEvent.click(mobile480Button!);

        // Since adaptiveMode was true, it should have toggled adaptive mode and changed quality to 480p
        expect(onToggleAdaptive).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('480p');

        // Modal should close
        expect(screen.queryByText('Video Quality')).toBeNull();
    });

    it('disables qualities that exceed source video resolution', () => {
        render(
            <QualitySelector
                currentQuality="720p"
                onChange={vi.fn()}
                adaptiveMode={false}
                onToggleAdaptive={vi.fn()}
                sourceHeight={720}
                transcodeCapabilities={{ available: true, variants: [], mode: 'hls' }}
            />
        );

        const trigger = screen.getByRole('button', { name: /select video playback quality/i });
        fireEvent.click(trigger);

        // Find 1080p button in mobile sheet
        const p1080Buttons = screen.getAllByRole('button').filter(b => b.textContent?.includes('1080p'));
        const mobile1080Button = p1080Buttons.find(b => b.textContent?.includes('upscale disabled'));
        expect(mobile1080Button).toBeDefined();
        expect((mobile1080Button as HTMLButtonElement).disabled).toBe(true);
    });
});
