import type { PitchOptions } from '../components/PitchOptionsModal';

interface UserSettings {
  email: string;
  pitchOptions: PitchOptions;
  lastUpdated: string;
}

const SETTINGS_KEY_PREFIX = 'user_settings_';

/**
 * Save pitch settings for a user by email
 */
export function savePitchSettings(email: string, pitchOptions: PitchOptions): void {
  if (!email) {
    console.warn('Cannot save pitch settings: No email provided');
    return;
  }

  const settings: UserSettings = {
    email,
    pitchOptions,
    lastUpdated: new Date().toISOString(),
  };

  try {
    const key = SETTINGS_KEY_PREFIX + email.toLowerCase().trim();
    localStorage.setItem(key, JSON.stringify(settings));
    console.log(`✓ Saved pitch settings for ${email}`);
  } catch (error) {
    console.error('Failed to save pitch settings:', error);
  }
}

/**
 * Load pitch settings for a user by email
 */
export function loadPitchSettings(email: string): PitchOptions | null {
  if (!email) {
    return null;
  }

  try {
    const key = SETTINGS_KEY_PREFIX + email.toLowerCase().trim();
    const stored = localStorage.getItem(key);

    if (!stored) {
      console.log(`No saved settings found for ${email}`);
      return null;
    }

    const settings: UserSettings = JSON.parse(stored);
    console.log(`✓ Loaded pitch settings for ${email} (last updated: ${settings.lastUpdated})`);
    return settings.pitchOptions;
  } catch (error) {
    console.error('Failed to load pitch settings:', error);
    return null;
  }
}

/**
 * Get default pitch options
 */
export function getDefaultPitchOptions(): PitchOptions {
  return {
    tone: 'neutral',
    length: 'standard',
    technicalLevel: 'moderate',
    focus: 'balanced',
    urgency: 'moderate',
    style: 'balanced',
    cta: 'moderate',
  };
}
