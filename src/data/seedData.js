import { STORAGE_KEYS } from './constants';

export const defaultSettings = {
  doctorName: 'Dr. Jane Smith',
  signatureImageUrl: '',
  sealImageUrl: '',
};

export const seedPatients = [
  {
    id: 'patient-001',
    name: 'John Doe',
    dateOfBirth: '1992-06-10',
    gender: 'Male',
    phone: '+1 555-1001',
    email: 'john.doe@example.com',
    address: '45 Oak Avenue',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'patient-002',
    name: 'Sarah Miller',
    dateOfBirth: '1998-06-10',
    gender: 'Female',
    phone: '+1 555-1002',
    email: 'sarah.miller@example.com',
    address: '78 Pine Road',
    createdAt: '2026-02-03T14:30:00.000Z',
  },
  {
    id: 'patient-003',
    name: 'Robert Chen',
    dateOfBirth: '1974-06-10',
    gender: 'Male',
    phone: '+1 555-1003',
    email: 'robert.chen@example.com',
    address: '12 Maple Lane',
    createdAt: '2026-03-10T09:15:00.000Z',
  },
];

export const seedPrescriptions = [
  {
    id: 'rx-001',
    patientId: 'patient-001',
    patientName: 'John Doe',
    diagnosis: 'Seasonal allergic rhinitis',
    medicines: [
      { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '7 days' },
      { name: 'Saline Nasal Spray', dosage: '2 sprays', frequency: 'Twice daily', duration: '7 days' },
    ],
    notes: 'Avoid outdoor allergens where possible.',
    createdAt: '2026-03-12T11:00:00.000Z',
  },
  {
    id: 'rx-002',
    patientId: 'patient-002',
    patientName: 'Sarah Miller',
    diagnosis: 'Acute bronchitis',
    medicines: [
      { name: 'Amoxicillin', dosage: '500mg', frequency: 'Three times daily', duration: '5 days' },
      { name: 'Guaifenesin', dosage: '400mg', frequency: 'Twice daily', duration: '5 days' },
    ],
    notes: 'Increase fluid intake and rest.',
    createdAt: '2026-04-01T16:45:00.000Z',
  },
];

export function getSeedData() {
  return {
    [STORAGE_KEYS.PATIENTS]: seedPatients,
    [STORAGE_KEYS.PRESCRIPTIONS]: seedPrescriptions,
    [STORAGE_KEYS.SETTINGS]: defaultSettings,
  };
}
