export interface Country {
  name: string;
  iso: string;
  dialCode: string;
  flag: string;
  placeholder?: string;
}

export const COUNTRIES: Country[] = [
  { name: 'Afghanistan', iso: 'AF', dialCode: '+93', flag: '🇦🇫', placeholder: '70 123 4567' },
  { name: 'Albania', iso: 'AL', dialCode: '+355', flag: '🇦🇱', placeholder: '69 123 4567' },
  { name: 'Algeria', iso: 'DZ', dialCode: '+213', flag: '🇩🇿', placeholder: '551 23 45 67' },
  { name: 'Andorra', iso: 'AD', dialCode: '+376', flag: '🇦🇩', placeholder: '312 345' },
  { name: 'Angola', iso: 'AO', dialCode: '+244', flag: '🇦🇴', placeholder: '923 123 456' },
  { name: 'Argentina', iso: 'AR', dialCode: '+54', flag: '🇦🇷', placeholder: '9 11 1234 5678' },
  { name: 'Armenia', iso: 'AM', dialCode: '+374', flag: '🇦🇲', placeholder: '77 123456' },
  { name: 'Australia', iso: 'AU', dialCode: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { name: 'Austria', iso: 'AT', dialCode: '+43', flag: '🇦🇹', placeholder: '664 1234567' },
  { name: 'Azerbaijan', iso: 'AZ', dialCode: '+994', flag: '🇦🇿', placeholder: '50 123 45 67' },
  { name: 'Bahamas', iso: 'BS', dialCode: '+1242', flag: '🇧🇸', placeholder: '359 1234' },
  { name: 'Bahrain', iso: 'BH', dialCode: '+973', flag: '🇧🇭', placeholder: '3612 3456' },
  { name: 'Bangladesh', iso: 'BD', dialCode: '+880', flag: '🇧🇩', placeholder: '1712 345678' },
  { name: 'Belarus', iso: 'BY', dialCode: '+375', flag: '🇧🇾', placeholder: '29 123 45 67' },
  { name: 'Belgium', iso: 'BE', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56' },
  { name: 'Belize', iso: 'BZ', dialCode: '+501', flag: '🇧🇿', placeholder: '622 1234' },
  { name: 'Benin', iso: 'BJ', dialCode: '+229', flag: '🇧🇯', placeholder: '97 12 34 56' },
  { name: 'Bhutan', iso: 'BT', dialCode: '+975', flag: '🇧🇹', placeholder: '17 12 34 56' },
  { name: 'Bolivia', iso: 'BO', dialCode: '+591', flag: '🇧🇴', placeholder: '71234567' },
  { name: 'Bosnia and Herzegovina', iso: 'BA', dialCode: '+387', flag: '🇧🇦', placeholder: '61 123 456' },
  { name: 'Botswana', iso: 'BW', dialCode: '+267', flag: '🇧🇼', placeholder: '71 123 456' },
  { name: 'Brazil', iso: 'BR', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234 5678' },
  { name: 'Brunei', iso: 'BN', dialCode: '+673', flag: '🇧🇳', placeholder: '712 3456' },
  { name: 'Bulgaria', iso: 'BG', dialCode: '+359', flag: '🇧🇬', placeholder: '87 123 4567' },
  { name: 'Burkina Faso', iso: 'BF', dialCode: '+226', flag: '🇧🇫', placeholder: '70 12 34 56' },
  { name: 'Burundi', iso: 'BI', dialCode: '+257', flag: '🇧🇮', placeholder: '79 12 34 56' },
  { name: 'Cambodia', iso: 'KH', dialCode: '+855', flag: '🇰🇭', placeholder: '12 345 678' },
  { name: 'Cameroon', iso: 'CM', dialCode: '+237', flag: '🇨🇲', placeholder: '6 71 23 45 67' },
  { name: 'Canada', iso: 'CA', dialCode: '+1', flag: '🇨🇦', placeholder: '416 123 4567' },
  { name: 'Chile', iso: 'CL', dialCode: '+56', flag: '🇨🇱', placeholder: '9 1234 5678' },
  { name: 'China', iso: 'CN', dialCode: '+86', flag: '🇨🇳', placeholder: '138 0013 8000' },
  { name: 'Colombia', iso: 'CO', dialCode: '+57', flag: '🇨🇴', placeholder: '300 123 4567' },
  { name: 'Congo', iso: 'CG', dialCode: '+242', flag: '🇨🇬', placeholder: '06 123 4567' },
  { name: 'Costa Rica', iso: 'CR', dialCode: '+506', flag: '🇨🇷', placeholder: '8312 3456' },
  { name: 'Croatia', iso: 'HR', dialCode: '+385', flag: '🇭🇷', placeholder: '91 123 4567' },
  { name: 'Cuba', iso: 'CU', dialCode: '+53', flag: '🇨🇺', placeholder: '5 1234567' },
  { name: 'Cyprus', iso: 'CY', dialCode: '+357', flag: '🇨🇾', placeholder: '96 123456' },
  { name: 'Czech Republic', iso: 'CZ', dialCode: '+420', flag: '🇨🇿', placeholder: '601 123 456' },
  { name: 'Denmark', iso: 'DK', dialCode: '+45', flag: '🇩🇰', placeholder: '20 12 34 56' },
  { name: 'Dominican Republic', iso: 'DO', dialCode: '+1809', flag: '🇩🇴', placeholder: '809 234 5678' },
  { name: 'Ecuador', iso: 'EC', dialCode: '+593', flag: '🇪🇨', placeholder: '99 123 4567' },
  { name: 'Egypt', iso: 'EG', dialCode: '+20', flag: '🇪🇬', placeholder: '100 123 4567' },
  { name: 'El Salvador', iso: 'SV', dialCode: '+503', flag: '🇸🇻', placeholder: '7012 3456' },
  { name: 'Estonia', iso: 'EE', dialCode: '+372', flag: '🇪🇪', placeholder: '5123 4567' },
  { name: 'Ethiopia', iso: 'ET', dialCode: '+251', flag: '🇪🇹', placeholder: '91 123 4567' },
  { name: 'Finland', iso: 'FI', dialCode: '+358', flag: '🇫🇮', placeholder: '41 234 5678' },
  { name: 'France', iso: 'FR', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { name: 'Georgia', iso: 'GE', dialCode: '+995', flag: '🇬🇪', placeholder: '599 12 34 56' },
  { name: 'Germany', iso: 'DE', dialCode: '+49', flag: '🇩🇪', placeholder: '151 12345678' },
  { name: 'Ghana', iso: 'GH', dialCode: '+233', flag: '🇬🇭', placeholder: '20 123 4567' },
  { name: 'Greece', iso: 'GR', dialCode: '+30', flag: '🇬🇷', placeholder: '691 234 5678' },
  { name: 'Guatemala', iso: 'GT', dialCode: '+502', flag: '🇬🇹', placeholder: '5123 4567' },
  { name: 'Honduras', iso: 'HN', dialCode: '+504', flag: '🇭🇳', placeholder: '9123 4567' },
  { name: 'Hong Kong', iso: 'HK', dialCode: '+852', flag: '🇭🇰', placeholder: '5123 4567' },
  { name: 'Hungary', iso: 'HU', dialCode: '+36', flag: '🇭🇺', placeholder: '20 123 4567' },
  { name: 'Iceland', iso: 'IS', dialCode: '+354', flag: '🇮🇸', placeholder: '612 3456' },
  { name: 'India', iso: 'IN', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { name: 'Indonesia', iso: 'ID', dialCode: '+62', flag: '🇮🇩', placeholder: '812 3456 7890' },
  { name: 'Iran', iso: 'IR', dialCode: '+98', flag: '🇮🇷', placeholder: '912 345 6789' },
  { name: 'Iraq', iso: 'IQ', dialCode: '+964', flag: '🇮🇶', placeholder: '790 123 4567' },
  { name: 'Ireland', iso: 'IE', dialCode: '+353', flag: '🇮🇪', placeholder: '85 123 4567' },
  { name: 'Israel', iso: 'IL', dialCode: '+972', flag: '🇮🇱', placeholder: '50 123 4567' },
  { name: 'Italy', iso: 'IT', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789' },
  { name: 'Ivory Coast', iso: 'CI', dialCode: '+225', flag: '🇨🇮', placeholder: '07 12 34 56' },
  { name: 'Jamaica', iso: 'JM', dialCode: '+1876', flag: '🇯🇲', placeholder: '876 234 5678' },
  { name: 'Japan', iso: 'JP', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { name: 'Jordan', iso: 'JO', dialCode: '+962', flag: '🇯🇴', placeholder: '7 9012 3456' },
  { name: 'Kazakhstan', iso: 'KZ', dialCode: '+7', flag: '🇰🇿', placeholder: '701 123 4567' },
  { name: 'Kenya', iso: 'KE', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678' },
  { name: 'Kuwait', iso: 'KW', dialCode: '+965', flag: '🇰🇼', placeholder: '5001 2345' },
  { name: 'Kyrgyzstan', iso: 'KG', dialCode: '+996', flag: '🇰🇬', placeholder: '555 123 456' },
  { name: 'Laos', iso: 'LA', dialCode: '+856', flag: '🇱🇦', placeholder: '20 12 345 678' },
  { name: 'Latvia', iso: 'LV', dialCode: '+371', flag: '🇱🇻', placeholder: '21 234 567' },
  { name: 'Lebanon', iso: 'LB', dialCode: '+961', flag: '🇱🇧', placeholder: '70 123 456' },
  { name: 'Libya', iso: 'LY', dialCode: '+218', flag: '🇱🇾', placeholder: '91 123 4567' },
  { name: 'Lithuania', iso: 'LT', dialCode: '+370', flag: '🇱🇹', placeholder: '612 34567' },
  { name: 'Luxembourg', iso: 'LU', dialCode: '+352', flag: '🇱🇺', placeholder: '621 123 456' },
  { name: 'Malaysia', iso: 'MY', dialCode: '+60', flag: '🇲🇾', placeholder: '12 345 6789' },
  { name: 'Maldives', iso: 'MV', dialCode: '+960', flag: '🇲🇻', placeholder: '712 3456' },
  { name: 'Mali', iso: 'ML', dialCode: '+223', flag: '🇲🇱', placeholder: '65 12 34 56' },
  { name: 'Malta', iso: 'MT', dialCode: '+356', flag: '🇲🇹', placeholder: '9912 3456' },
  { name: 'Mauritius', iso: 'MU', dialCode: '+230', flag: '🇲🇺', placeholder: '5251 2345' },
  { name: 'Mexico', iso: 'MX', dialCode: '+52', flag: '🇲🇽', placeholder: '1 55 1234 5678' },
  { name: 'Moldova', iso: 'MD', dialCode: '+373', flag: '🇲🇩', placeholder: '601 23 456' },
  { name: 'Monaco', iso: 'MC', dialCode: '+377', flag: '🇲🇨', placeholder: '6 12 34 56 78' },
  { name: 'Mongolia', iso: 'MN', dialCode: '+976', flag: '🇲🇳', placeholder: '8812 3456' },
  { name: 'Montenegro', iso: 'ME', dialCode: '+382', flag: '🇲🇪', placeholder: '67 123 456' },
  { name: 'Morocco', iso: 'MA', dialCode: '+212', flag: '🇲🇦', placeholder: '612 345678' },
  { name: 'Mozambique', iso: 'MZ', dialCode: '+258', flag: '🇲🇿', placeholder: '82 123 4567' },
  { name: 'Myanmar', iso: 'MM', dialCode: '+95', flag: '🇲🇲', placeholder: '9 123 456 789' },
  { name: 'Namibia', iso: 'NA', dialCode: '+264', flag: '🇳🇦', placeholder: '81 123 4567' },
  { name: 'Nepal', iso: 'NP', dialCode: '+977', flag: '🇳🇵', placeholder: '984 1234567' },
  { name: 'Netherlands', iso: 'NL', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { name: 'New Zealand', iso: 'NZ', dialCode: '+64', flag: '🇳🇿', placeholder: '21 123 4567' },
  { name: 'Nicaragua', iso: 'NI', dialCode: '+505', flag: '🇳🇮', placeholder: '8123 4567' },
  { name: 'Nigeria', iso: 'NG', dialCode: '+234', flag: '🇳🇬', placeholder: '802 123 4567' },
  { name: 'North Macedonia', iso: 'MK', dialCode: '+389', flag: '🇲🇰', placeholder: '70 123 456' },
  { name: 'Norway', iso: 'NO', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567' },
  { name: 'Oman', iso: 'OM', dialCode: '+968', flag: '🇴🇲', placeholder: '9123 4567' },
  { name: 'Pakistan', iso: 'PK', dialCode: '+92', flag: '🇵🇰', placeholder: '301 2345678' },
  { name: 'Palestine', iso: 'PS', dialCode: '+970', flag: '🇵🇸', placeholder: '599 123 456' },
  { name: 'Panama', iso: 'PA', dialCode: '+507', flag: '🇵🇦', placeholder: '6123 4567' },
  { name: 'Paraguay', iso: 'PY', dialCode: '+595', flag: '🇵🇾', placeholder: '981 123456' },
  { name: 'Peru', iso: 'PE', dialCode: '+51', flag: '🇵🇪', placeholder: '912 345 678' },
  { name: 'Philippines', iso: 'PH', dialCode: '+63', flag: '🇵🇭', placeholder: '917 123 4567' },
  { name: 'Poland', iso: 'PL', dialCode: '+48', flag: '🇵🇱', placeholder: '512 345 678' },
  { name: 'Portugal', iso: 'PT', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678' },
  { name: 'Qatar', iso: 'QA', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { name: 'Romania', iso: 'RO', dialCode: '+40', flag: '🇷🇴', placeholder: '712 345 678' },
  { name: 'Russia', iso: 'RU', dialCode: '+7', flag: '🇷🇺', placeholder: '912 345-67-89' },
  { name: 'Rwanda', iso: 'RW', dialCode: '+250', flag: '🇷🇼', placeholder: '788 123 456' },
  { name: 'Saudi Arabia', iso: 'SA', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { name: 'Senegal', iso: 'SN', dialCode: '+221', flag: '🇸🇳', placeholder: '77 123 45 67' },
  { name: 'Serbia', iso: 'RS', dialCode: '+381', flag: '🇷🇸', placeholder: '60 1234567' },
  { name: 'Singapore', iso: 'SG', dialCode: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { name: 'Slovakia', iso: 'SK', dialCode: '+421', flag: '🇸🇰', placeholder: '912 345 678' },
  { name: 'Slovenia', iso: 'SI', dialCode: '+386', flag: '🇸🇮', placeholder: '41 234 567' },
  { name: 'Somalia', iso: 'SO', dialCode: '+252', flag: '🇸🇴', placeholder: '61 2345678' },
  { name: 'South Africa', iso: 'ZA', dialCode: '+27', flag: '🇿🇦', placeholder: '71 123 4567' },
  { name: 'South Korea', iso: 'KR', dialCode: '+82', flag: '🇰🇷', placeholder: '10-1234-5678' },
  { name: 'Spain', iso: 'ES', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { name: 'Sri Lanka', iso: 'LK', dialCode: '+94', flag: '🇱🇰', placeholder: '71 234 5678' },
  { name: 'Sudan', iso: 'SD', dialCode: '+249', flag: '🇸🇩', placeholder: '91 123 4567' },
  { name: 'Sweden', iso: 'SE', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
  { name: 'Switzerland', iso: 'CH', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67' },
  { name: 'Syria', iso: 'SY', dialCode: '+963', flag: '🇸🇾', placeholder: '944 123 456' },
  { name: 'Taiwan', iso: 'TW', dialCode: '+886', flag: '🇹🇼', placeholder: '912 345 678' },
  { name: 'Tajikistan', iso: 'TJ', dialCode: '+992', flag: '🇹🇯', placeholder: '918 12 3456' },
  { name: 'Tanzania', iso: 'TZ', dialCode: '+255', flag: '🇹🇿', placeholder: '712 345 678' },
  { name: 'Thailand', iso: 'TH', dialCode: '+66', flag: '🇹🇭', placeholder: '81 234 5678' },
  { name: 'Tunisia', iso: 'TN', dialCode: '+216', flag: '🇹🇳', placeholder: '20 123 456' },
  { name: 'Turkey', iso: 'TR', dialCode: '+90', flag: '🇹🇷', placeholder: '501 234 56 78' },
  { name: 'Uganda', iso: 'UG', dialCode: '+256', flag: '🇺🇬', placeholder: '712 345678' },
  { name: 'Ukraine', iso: 'UA', dialCode: '+380', flag: '🇺🇦', placeholder: '50 123 4567' },
  { name: 'United Arab Emirates', iso: 'AE', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'United Kingdom', iso: 'GB', dialCode: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { name: 'United States', iso: 'US', dialCode: '+1', flag: '🇺🇸', placeholder: '202 555 0123' },
  { name: 'Uruguay', iso: 'UY', dialCode: '+598', flag: '🇺🇾', placeholder: '94 123 456' },
  { name: 'Uzbekistan', iso: 'UZ', dialCode: '+998', flag: '🇺🇿', placeholder: '90 123 45 67' },
  { name: 'Venezuela', iso: 'VE', dialCode: '+58', flag: '🇻🇪', placeholder: '412 1234567' },
  { name: 'Vietnam', iso: 'VN', dialCode: '+84', flag: '🇻🇳', placeholder: '91 234 56 78' },
  { name: 'Yemen', iso: 'YE', dialCode: '+967', flag: '🇾🇪', placeholder: '71 234 567' },
  { name: 'Zambia', iso: 'ZM', dialCode: '+260', flag: '🇿🇲', placeholder: '955 123456' },
  { name: 'Zimbabwe', iso: 'ZW', dialCode: '+263', flag: '🇿🇼', placeholder: '71 234 5678' },
];

export const DEFAULT_COUNTRY: Country = {
  name: 'India',
  iso: 'IN',
  dialCode: '+91',
  flag: '🇮🇳',
  placeholder: '98765 43210',
};

const PRIMARY_COUNTRY_BY_DIAL_CODE: Record<string, string> = {
  '+1': 'US',
  '+7': 'RU',
};

// Sorted by dialCode length descending to ensure longer prefixes match first (e.g. +1242 before +1),
// and prioritizing primary countries when dialCodes are identical (e.g. US before CA for +1).
const SORTED_BY_DIAL_CODE_DESC = [...COUNTRIES].sort((a, b) => {
  if (b.dialCode.length !== a.dialCode.length) {
    return b.dialCode.length - a.dialCode.length;
  }
  const primaryIso = PRIMARY_COUNTRY_BY_DIAL_CODE[a.dialCode];
  if (primaryIso) {
    if (a.iso === primaryIso) return -1;
    if (b.iso === primaryIso) return 1;
  }
  return 0;
});

export function findCountryByIso(iso: string): Country | undefined {
  const upper = iso.toUpperCase();
  return COUNTRIES.find((c) => c.iso === upper);
}

export function findCountryByDialCode(dialCode: string): Country | undefined {
  const normalized = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  const primaryIso = PRIMARY_COUNTRY_BY_DIAL_CODE[normalized];
  if (primaryIso) {
    const primary = COUNTRIES.find((c) => c.iso === primaryIso);
    if (primary) return primary;
  }
  return COUNTRIES.find((c) => c.dialCode === normalized);
}

export function detectCountryFromPhone(phone: string): { country: Country; nationalNumber: string } | null {
  const cleaned = phone.trim();
  if (!cleaned) return null;

  const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

  for (const country of SORTED_BY_DIAL_CODE_DESC) {
    if (withPlus.startsWith(country.dialCode)) {
      const rest = withPlus.slice(country.dialCode.length).trim();
      return {
        country,
        nationalNumber: rest,
      };
    }
  }

  return null;
}

export function guessUserCountry(): Country {
  if (typeof window === 'undefined') return DEFAULT_COUNTRY;

  try {
    // 1. Check time zone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      if (timeZone.includes('Calcutta') || timeZone.includes('Kolkata')) return findCountryByIso('IN') || DEFAULT_COUNTRY;
      if (timeZone.includes('New_York') || timeZone.includes('Chicago') || timeZone.includes('Los_Angeles') || timeZone.includes('Denver')) return findCountryByIso('US') || DEFAULT_COUNTRY;
      if (timeZone.includes('London')) return findCountryByIso('GB') || DEFAULT_COUNTRY;
      if (timeZone.includes('Berlin')) return findCountryByIso('DE') || DEFAULT_COUNTRY;
      if (timeZone.includes('Paris')) return findCountryByIso('FR') || DEFAULT_COUNTRY;
      if (timeZone.includes('Moscow')) return findCountryByIso('RU') || DEFAULT_COUNTRY;
      if (timeZone.includes('Dubai')) return findCountryByIso('AE') || DEFAULT_COUNTRY;
      if (timeZone.includes('Dhaka')) return findCountryByIso('BD') || DEFAULT_COUNTRY;
      if (timeZone.includes('Karachi')) return findCountryByIso('PK') || DEFAULT_COUNTRY;
      if (timeZone.includes('Jakarta')) return findCountryByIso('ID') || DEFAULT_COUNTRY;
      if (timeZone.includes('Tokyo')) return findCountryByIso('JP') || DEFAULT_COUNTRY;
      if (timeZone.includes('Seoul')) return findCountryByIso('KR') || DEFAULT_COUNTRY;
      if (timeZone.includes('Sao_Paulo')) return findCountryByIso('BR') || DEFAULT_COUNTRY;
      if (timeZone.includes('Toronto') || timeZone.includes('Vancouver')) return findCountryByIso('CA') || DEFAULT_COUNTRY;
      if (timeZone.includes('Sydney') || timeZone.includes('Melbourne')) return findCountryByIso('AU') || DEFAULT_COUNTRY;
      if (timeZone.includes('Singapore')) return findCountryByIso('SG') || DEFAULT_COUNTRY;
      if (timeZone.includes('Bangkok')) return findCountryByIso('TH') || DEFAULT_COUNTRY;
      if (timeZone.includes('Istanbul')) return findCountryByIso('TR') || DEFAULT_COUNTRY;
      if (timeZone.includes('Rome')) return findCountryByIso('IT') || DEFAULT_COUNTRY;
      if (timeZone.includes('Madrid')) return findCountryByIso('ES') || DEFAULT_COUNTRY;
      if (timeZone.includes('Warsaw')) return findCountryByIso('PL') || DEFAULT_COUNTRY;
      if (timeZone.includes('Kyiv')) return findCountryByIso('UA') || DEFAULT_COUNTRY;
    }

    // 2. Check navigator.languages / language (e.g. "en-IN", "hi-IN", "en-US")
    const languages = navigator.languages || [navigator.language];
    for (const lang of languages) {
      if (!lang) continue;
      const parts = lang.split('-');
      if (parts.length > 1) {
        const iso = parts[1].toUpperCase();
        const found = findCountryByIso(iso);
        if (found) return found;
      }
    }
  } catch {
    // Fallback to default
  }

  return DEFAULT_COUNTRY;
}
