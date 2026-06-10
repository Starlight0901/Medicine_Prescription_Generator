import { STORAGE_KEYS } from '../data/constants';
import { defaultSettings } from '../data/seedData';
import { getItem, setItem } from './storageService';
import { getAllPatients } from './patientsService';

function ensureSeeded() {
  getAllPatients();
}

export function normalizeSettings(raw = {}) {
  return {
    doctorName: String(raw.doctorName ?? '').trim(),
    signatureImageUrl: String(raw.signatureImageUrl ?? '').trim(),
    sealImageUrl: String(raw.sealImageUrl ?? '').trim(),
  };
}

function validateSettings(settings) {
  const errors = {};

  if (!settings.doctorName) {
    errors.doctorName = 'Doctor name is required.';
  }

  return errors;
}

export function getSettings() {
  ensureSeeded();
  const stored = getItem(STORAGE_KEYS.SETTINGS, defaultSettings);
  return normalizeSettings(stored);
}

export function saveSettings(settingsInput) {
  const settings = normalizeSettings(settingsInput);
  const errors = validateSettings(settings);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, data: settings };
  }

  setItem(STORAGE_KEYS.SETTINGS, settings);
  return { success: true, data: settings };
}

export function updateSettings(updates) {
  return saveSettings({ ...getSettings(), ...updates });
}

export function resetSettings() {
  setItem(STORAGE_KEYS.SETTINGS, defaultSettings);
  return { success: true, data: normalizeSettings(defaultSettings) };
}
