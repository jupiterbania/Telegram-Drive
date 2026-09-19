// ── Email Validation & Typo Detection Utility ──────────────────────────

const DOMAIN_TYPO_MAP: Record<string, string> = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaild.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',

  // Yahoo typos
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yaho.co.in': 'yahoo.co.in',
  'yahoo.con': 'yahoo.com',

  // Hotmail & Outlook typos
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',

  // iCloud typos
  'iclud.com': 'icloud.com',
  'icould.com': 'icloud.com',
};

// Known temporary / disposable throwaway domains that shouldn't receive trial keys
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  '10minutemail.net',
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'trashmail.com',
  'trashmail.net',
  'getairmail.com',
  'mohmal.com',
  'dispostable.com',
  'nada.ltd',
  'inboxkitten.com',
  'mytemp.email',
  'crazymailing.com',
  'burnermail.io',
  'maildrop.cc',
]);

export interface EmailCheckResult {
  isValid: boolean;
  error?: string;
  suggestedCorrection?: string;
}

export function checkEmailValidity(rawEmail: string): EmailCheckResult {
  const email = rawEmail.trim().toLowerCase();
  if (!email) {
    return { isValid: false, error: 'Email address is required.' };
  }

  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address format (e.g. name@example.com).' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address.' };
  }

  const [localPart, domain] = parts;

  if (!localPart || localPart.length > 64) {
    return { isValid: false, error: 'Email username is invalid.' };
  }

  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'Email domain is incomplete.' };
  }

  // Check for disposable email
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: 'Temporary/disposable email services are not permitted. Please use your personal or work email.',
    };
  }

  // Check for common typo suggestions
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestedDomain = DOMAIN_TYPO_MAP[domain];
    const suggestedCorrection = `${localPart}@${suggestedDomain}`;
    return {
      isValid: true,
      suggestedCorrection,
    };
  }

  return { isValid: true };
}
