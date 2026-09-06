export const SUPPORTED_LOCALES = [
  'en-NG',
  'en-GB',
  'en-US',
  'fr-FR',
  'ar-SA',
  'ha-NG',
  'yo-NG',
  'ig-NG',
  'zh-CN',
  'pt-PT',
  'es-ES',
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const RTL_LOCALES: SupportedLocale[] = ['ar-SA'];

export const isSupportedLocale = (locale: string | null | undefined): locale is SupportedLocale =>
  Boolean(locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale));

export const resolveLocale = (locale?: string | null): SupportedLocale => {
  if (isSupportedLocale(locale)) return locale;
  const language = locale?.split('-')[0];
  return SUPPORTED_LOCALES.find((candidate) => candidate.startsWith(`${language}-`)) ?? 'en-NG';
};

export const isRtlLocale = (locale?: string | null): boolean => RTL_LOCALES.includes(resolveLocale(locale));

export const formatNumber = (value: number, locale?: string | null, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(resolveLocale(locale), options).format(value);

export const formatDate = (
  value: Date | string | number,
  locale?: string | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string => new Intl.DateTimeFormat(resolveLocale(locale), options).format(new Date(value));

export const formatCurrency = (value: number, currency: string, locale?: string | null): string =>
  new Intl.NumberFormat(resolveLocale(locale), { style: 'currency', currency }).format(value);
