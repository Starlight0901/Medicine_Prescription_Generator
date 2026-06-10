export const STORAGE_KEYS = {
  PATIENTS: 'dpm_patients',
  PRESCRIPTIONS: 'dpm_prescriptions',
  SETTINGS: 'dpm_settings',
  SEEDED: 'dpm_seeded',
  AUTH_SESSION: 'dpm_auth_session',
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  PATIENTS: '/patients',
  NEW_PRESCRIPTION: '/prescriptions/new',
  HISTORY: '/history',
  SETTINGS: '/settings',
};

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Patients', path: ROUTES.PATIENTS },
  { label: 'New Prescription', path: ROUTES.NEW_PRESCRIPTION },
  { label: 'History', path: ROUTES.HISTORY },
  { label: 'Settings', path: ROUTES.SETTINGS },
];
