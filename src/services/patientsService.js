import { STORAGE_KEYS } from '../data/constants';
import { getSeedData } from '../data/seedData';
import { generateId } from '../utils/idGenerator';
import { deriveDateOfBirthFromAge, toISODateString } from '../utils/dateUtils';
import { getItem, setItem } from './storageService';

function ensureSeeded() {
  const seeded = getItem(STORAGE_KEYS.SEEDED, false);
  if (seeded) return;

  const seedData = getSeedData();
  Object.entries(seedData).forEach(([key, value]) => setItem(key, value));
  setItem(STORAGE_KEYS.SEEDED, true);
}

function normalizeStoredPatient(patient) {
  const { age, ...rest } = patient;
  let dateOfBirth = rest.dateOfBirth;

  if (!dateOfBirth && age != null) {
    dateOfBirth = deriveDateOfBirthFromAge(age);
  }

  return {
    ...rest,
    dateOfBirth,
    phone: String(rest.phone ?? '').trim(),
  };
}

function readPatients() {
  ensureSeeded();
  const patients = getItem(STORAGE_KEYS.PATIENTS, []);
  const normalized = patients.map(normalizeStoredPatient);
  const needsMigration = patients.some((patient) => 'age' in patient || !patient.dateOfBirth);

  if (needsMigration) {
    writePatients(normalized);
  }

  return normalized;
}

function writePatients(patients) {
  setItem(STORAGE_KEYS.PATIENTS, patients);
}

function normalizePatientInput({ name, dateOfBirth, gender, phone }) {
  return {
    name: name.trim(),
    dateOfBirth: String(dateOfBirth ?? '').trim(),
    gender: gender.trim(),
    phone: String(phone ?? '').trim(),
  };
}

function validatePatientInput(patient) {
  const errors = {};

  if (!patient.name) errors.name = 'Name is required.';

  if (!patient.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else {
    const dob = new Date(patient.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  return errors;
}

export function getAllPatients() {
  return readPatients().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getPatientById(id) {
  return readPatients().find((patient) => patient.id === id) ?? null;
}

export function createPatient(patientInput) {
  const patient = normalizePatientInput(patientInput);
  const errors = validatePatientInput(patient);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const newPatient = {
    id: generateId('patient'),
    ...patient,
    createdAt: toISODateString(),
  };

  const patients = readPatients();
  patients.push(newPatient);
  writePatients(patients);

  return { success: true, data: newPatient };
}

export function updatePatient(id, patientInput) {
  const patients = readPatients();
  const index = patients.findIndex((patient) => patient.id === id);

  if (index === -1) {
    return { success: false, errors: { form: 'Patient not found.' } };
  }

  const patient = normalizePatientInput(patientInput);
  const errors = validatePatientInput(patient);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const updatedPatient = {
    ...patients[index],
    ...patient,
    id,
  };

  patients[index] = updatedPatient;
  writePatients(patients);

  return { success: true, data: updatedPatient };
}

export function deletePatient(id) {
  const patients = readPatients();
  const filtered = patients.filter((patient) => patient.id !== id);

  if (filtered.length === patients.length) {
    return { success: false, error: 'Patient not found.' };
  }

  writePatients(filtered);
  return { success: true };
}

export function searchPatients(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const patients = getAllPatients();

  if (!normalizedQuery) return patients;

  return patients.filter((patient) =>
    patient.name.toLowerCase().includes(normalizedQuery)
  );
}
