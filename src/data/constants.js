export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  PATIENTS: '/patients',
  NEW_PRESCRIPTION: '/prescriptions/new',
  CERTIFICATES: '/certificates',
  CERTIFICATE_TEMPLATES: '/certificates/templates',
  HISTORY: '/history',
  SETTINGS: '/settings',
};

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Patients', path: ROUTES.PATIENTS },
  { label: 'New Prescription', path: ROUTES.NEW_PRESCRIPTION },
  { label: 'Certificates', path: ROUTES.CERTIFICATES },
  { label: 'History', path: ROUTES.HISTORY },
  { label: 'Settings', path: ROUTES.SETTINGS },
];
