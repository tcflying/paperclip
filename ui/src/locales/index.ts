import zh from './zh.json';
import en from './en.json';

export type Locale = 'zh' | 'en';

const translations: Record<Locale, Record<string, unknown>> = {
  zh,
  en,
};

let currentLocale: Locale = 'zh';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  localStorage.setItem('paperclip_locale', locale);
  window.dispatchEvent(new Event('localechange'));
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('paperclip_locale') as Locale | null;
    if (stored && (stored === 'zh' || stored === 'en')) {
      return stored;
    }
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zh';
    }
  }
  return currentLocale;
}

export function detectSystemLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) {
      return 'zh';
    }
  }
  return 'en';
}

export function t(key: string, params?: Record<string, string | number | undefined>): string {
  const locale = getLocale();
  const keys = key.split('.');
  let value: unknown = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`[i18n] Missing translation: ${key}`);
    return key;
  }

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
  }

  return value;
}

export function initLocale(): void {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('paperclip_locale') as Locale | null;
    if (stored && (stored === 'zh' || stored === 'en')) {
      currentLocale = stored;
    } else {
      currentLocale = detectSystemLocale();
    }
  }
}

export const locales: { code: Locale; label: string }[] = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];
