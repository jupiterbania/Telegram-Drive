import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, Globe } from 'lucide-react';
import { Country, COUNTRIES } from '../../../data/countries';

interface CountrySelectModalProps {
  isOpen: boolean;
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export function CountrySelectModal({
  isOpen,
  selectedCountry,
  onSelect,
  onClose,
}: CountrySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        selectedItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;

    const queryDigits = q.replace(/[^0-9]/g, '');

    return COUNTRIES.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchIso = c.iso.toLowerCase() === q;
      const matchDial = c.dialCode.toLowerCase().includes(q) ||
        (queryDigits && c.dialCode.replace(/[^0-9]/g, '').includes(queryDigits));
      return matchName || matchIso || matchDial;
    });
  }, [searchQuery]);

  if (!isOpen && typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-select-title"
            className="relative z-10 flex flex-col w-full max-w-md max-h-[85vh] sm:max-h-[75vh] overflow-hidden rounded-overlay border border-app-border bg-app-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-app-accent" />
                <h2 id="country-select-title" className="text-ui font-semibold text-app-text">
                  Select Country
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="quiet-control flex h-7 w-7 items-center justify-center rounded-control text-app-text-tertiary hover:bg-app-hover hover:text-app-text transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="border-b border-app-border/60 p-3 bg-app-surface-sunken/30 shrink-0">
              <div className="relative flex items-center">
                <Search className="absolute inset-inline-start-3 w-4 h-4 text-app-text-tertiary pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search country or dial code..."
                  className="auth-input ps-9 pe-9 h-9 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-inline-end-2.5 flex h-5 w-5 items-center justify-center rounded-full text-app-text-tertiary hover:text-app-text hover:bg-app-hover text-xs transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Countries List */}
            <div className="flex-1 overflow-y-auto divide-y divide-app-border-subtle/30 py-1">
              {filteredCountries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <p className="text-ui font-medium text-app-text-secondary">No countries found</p>
                  <p className="text-metadata text-app-text-tertiary mt-1">
                    Try searching with a different name or dial code
                  </p>
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.iso === selectedCountry.iso;
                  return (
                    <button
                      key={country.iso}
                      ref={isSelected ? selectedItemRef : undefined}
                      type="button"
                      onClick={() => {
                        onSelect(country);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-app-accent/10 hover:bg-app-accent/15'
                          : 'hover:bg-app-hover'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl leading-none select-none shrink-0" role="img" aria-label={country.name}>
                          {country.flag}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-ui font-medium truncate ${isSelected ? 'text-app-accent font-semibold' : 'text-app-text'}`}>
                              {country.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-app-accent shrink-0" />}
                          </div>
                          <span className="text-[11px] text-app-text-tertiary uppercase tracking-wider font-mono">
                            {country.iso}
                          </span>
                        </div>
                      </div>
                      <span className="ms-3 shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-app-surface-sunken/70 border border-app-border/40 text-app-text-secondary">
                        {country.dialCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
