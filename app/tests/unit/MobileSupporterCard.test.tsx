import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MobileSupporterCard } from '../../src/components/mobile/MobileSupporterCard';

describe('MobileSupporterCard', () => {
  it('renders null when supporter cards are superseded by Pro license', () => {
    const { container } = render(<MobileSupporterCard />);
    expect(container.firstChild).toBeNull();
  });
});
