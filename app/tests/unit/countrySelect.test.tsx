import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  detectCountryFromPhone,
  findCountryByDialCode,
  findCountryByIso,
  guessUserCountry,
} from '../../src/data/countries';
import { CountrySelectModal } from '../../src/components/shared/auth/CountrySelectModal';
import { AuthMethodStep } from '../../src/components/shared/auth/AuthSteps';

describe('countries data and helper functions', () => {
  it('contains essential countries with valid ISO, flags, and dial codes', () => {
    expect(COUNTRIES.length).toBeGreaterThan(100);

    const india = findCountryByIso('IN');
    expect(india).toBeDefined();
    expect(india?.dialCode).toBe('+91');
    expect(india?.flag).toBe('🇮🇳');

    const us = findCountryByIso('US');
    expect(us).toBeDefined();
    expect(us?.dialCode).toBe('+1');

    const uk = findCountryByDialCode('+44');
    expect(uk).toBeDefined();
    expect(uk?.iso).toBe('GB');
  });

  it('detects country and decomposes national number correctly', () => {
    const resIndia = detectCountryFromPhone('+919876543210');
    expect(resIndia).not.toBeNull();
    expect(resIndia?.country.iso).toBe('IN');
    expect(resIndia?.nationalNumber).toBe('9876543210');

    const resUS = detectCountryFromPhone('+15551234567');
    expect(resUS).not.toBeNull();
    expect(resUS?.country.iso).toBe('US');
    expect(resUS?.nationalNumber).toBe('5551234567');

    const resUK = detectCountryFromPhone('+44 7911 123456');
    expect(resUK).not.toBeNull();
    expect(resUK?.country.iso).toBe('GB');
    expect(resUK?.nationalNumber).toBe('7911 123456');
  });

  it('provides a default country fallback', () => {
    const country = guessUserCountry();
    expect(country).toBeDefined();
    expect(country.dialCode).toMatch(/^\+\d+/);
  });
});

describe('CountrySelectModal component', () => {
  it('renders modal with countries and handles search filtering', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <CountrySelectModal
        isOpen={true}
        selectedCountry={DEFAULT_COUNTRY}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Select Country')).toBeDefined();

    // Check search input
    const searchInput = screen.getByPlaceholderText('Search country or dial code...');
    expect(searchInput).toBeDefined();

    // Filter by name "Germany"
    fireEvent.change(searchInput, { target: { value: 'Germany' } });
    expect(screen.getByText('Germany')).toBeDefined();
    expect(screen.queryByText('Afghanistan')).toBeNull();

    // Filter by dial code "+44"
    fireEvent.change(searchInput, { target: { value: '+44' } });
    expect(screen.getByText('United Kingdom')).toBeDefined();

    // Select United Kingdom
    fireEvent.click(screen.getByText('United Kingdom'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ iso: 'GB', dialCode: '+44' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('AuthMethodStep country code selection', () => {
  it('displays country selector and allows changing country', () => {
    const onPhoneChange = vi.fn();
    const onPhoneSubmit = vi.fn();

    render(
      <AuthMethodStep
        isMobile={true}
        loginMethod="phone"
        loading={false}
        phone=""
        qrUrl={null}
        qrPolling={false}
        onPhoneChange={onPhoneChange}
        onSelectPhone={vi.fn()}
        onSelectQr={vi.fn()}
        onPhoneSubmit={onPhoneSubmit}
        onQrLogin={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Initial label
    expect(screen.getByText('Country')).toBeDefined();
    expect(screen.getByLabelText('Phone Number')).toBeDefined();

    // Click on country selector to open modal
    const countryButton = screen.getByRole('button', { name: /India/ });
    fireEvent.click(countryButton);

    expect(screen.getByText('Select Country')).toBeDefined();

    // Search and select United States
    const searchInput = screen.getByPlaceholderText('Search country or dial code...');
    fireEvent.change(searchInput, { target: { value: 'United States' } });
    fireEvent.click(screen.getByText('United States'));

    // Type national number
    const phoneInput = screen.getByLabelText('Phone Number');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });

    expect(onPhoneChange).toHaveBeenLastCalledWith('+15551234567');
  });
});
