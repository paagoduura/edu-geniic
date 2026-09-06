import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, isRtlLocale, resolveLocale } from './i18n';
import { normalizeRole, SCHOOL_ADMIN_ROLES } from './authorization';

describe('authorization contracts', () => {
  it('normalizes legacy school role aliases', () => {
    expect(normalizeRole('school-admin')).toBe('admin');
    expect(normalizeRole('learner')).toBe('student');
    expect(SCHOOL_ADMIN_ROLES).toContain('owner');
  });
});

describe('international formatting contracts', () => {
  it('falls back safely to a supported locale', () => {
    expect(resolveLocale('xx-XX')).toBe('en-NG');
    expect(resolveLocale('fr-CA')).toBe('fr-FR');
  });

  it('identifies RTL locales', () => {
    expect(isRtlLocale('ar-SA')).toBe(true);
    expect(isRtlLocale('en-NG')).toBe(false);
  });

  it('formats numbers and currencies using Intl', () => {
    expect(formatNumber(1234.5, 'en-NG')).toContain('1,234');
    expect(formatCurrency(1000, 'NGN', 'en-NG')).toContain('₦');
  });
});
