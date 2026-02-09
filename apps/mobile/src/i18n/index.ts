/**
 * i18n - Internationalization Setup
 * Supports English (en) and Turkish (tr)
 * Uses device locale by default, can be overridden in settings
 */
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import tr from './locales/tr.json';

// Create i18n instance
const i18n = new I18n({
  en,
  tr,
});

// Set default locale from device
i18n.defaultLocale = 'en';
i18n.locale = Localization.getLocales()[0]?.languageCode || 'en';

// Enable fallback to default locale
i18n.enableFallback = true;

/**
 * Translate a key with optional interpolation
 * @param key - Translation key (e.g., 'home.monthly')
 * @param options - Optional interpolation values
 */
export function t(key: string, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}

/**
 * Change the app language
 * @param locale - Language code ('en' or 'tr')
 */
export function setLocale(locale: 'en' | 'tr'): void {
  i18n.locale = locale;
}

/**
 * Get current locale
 */
export function getLocale(): string {
  return i18n.locale;
}

/**
 * Initialize locale from persisted settings.
 * Called once at app startup after Zustand rehydrates.
 * @param savedLanguage - The persisted language preference
 */
export function initLocaleFromSettings(savedLanguage: 'system' | 'en' | 'tr'): void {
  if (savedLanguage === 'system') {
    const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
    i18n.locale = deviceLocale === 'tr' ? 'tr' : 'en';
  } else {
    i18n.locale = savedLanguage;
  }
}

/**
 * Get list of available locales
 */
export function getAvailableLocales(): string[] {
  return Object.keys(i18n.translations);
}

// Export i18n instance for advanced usage
export { i18n };
