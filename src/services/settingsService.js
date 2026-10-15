import { doc, getDoc, setDoc } from 'firebase/firestore';
import { defaultSettings } from '../data/seedData';
import { db } from './firebase';

const settingsDocRef = doc(db, 'settings', 'system');

export function normalizeSettings(raw = {}) {
  return {
    doctorName: String(raw.doctorName ?? '').trim(),
    clinicAddress: String(raw.clinicAddress ?? '').trim(),
    clinicEmail: String(raw.clinicEmail ?? '').trim(),
    signatureImageUrl: String(raw.signatureImageUrl ?? '').trim(),
    sealImageUrl: String(raw.sealImageUrl ?? '').trim(),
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateSettings(settings) {
  const errors = {};

  if (!settings.doctorName) {
    errors.doctorName = 'Doctor name is required.';
  }

  if (settings.clinicEmail && !isValidEmail(settings.clinicEmail)) {
    errors.clinicEmail = 'Enter a valid email address.';
  }

  return errors;
}

function mapFirestoreError(error) {
  return error?.message || 'Failed to access settings. Please try again.';
}

export async function getSettings() {
  try {
    const snapshot = await getDoc(settingsDocRef);

    if (!snapshot.exists()) {
      return normalizeSettings(defaultSettings);
    }

    return normalizeSettings(snapshot.data());
  } catch (error) {
    console.error('Failed to load settings from Firestore:', error);
    return normalizeSettings(defaultSettings);
  }
}

export async function saveSettings(settingsInput) {
  const settings = normalizeSettings(settingsInput);
  const errors = validateSettings(settings);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, data: settings };
  }

  try {
    await setDoc(settingsDocRef, settings, { merge: true });
    return { success: true, data: settings };
  } catch (error) {
    console.error('Failed to save settings to Firestore:', error);
    return {
      success: false,
      errors: { form: mapFirestoreError(error) },
      data: settings,
    };
  }
}

export async function updateSettings(updates) {
  const current = await getSettings();
  return saveSettings({ ...current, ...updates });
}
