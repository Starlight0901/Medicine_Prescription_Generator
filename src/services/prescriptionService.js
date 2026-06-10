import { STORAGE_KEYS } from '../data/constants';
import { getItem, setItem } from './storageService';
import { getAllPatients } from './patientsService';

function ensureSeeded() {
  getAllPatients();
}

function readPrescriptions() {
  ensureSeeded();
  return getItem(STORAGE_KEYS.PRESCRIPTIONS, []);
}

function writePrescriptions(prescriptions) {
  setItem(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
}

export function getAllPrescriptions() {
  return readPrescriptions().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

export function getPrescriptionById(id) {
  return getAllPrescriptions().find((prescription) => prescription.id === id) ?? null;
}

export function getPrescriptionsByPatientId(patientId) {
  return getAllPrescriptions().filter(
    (prescription) => prescription.patientId === patientId
  );
}

export function createPrescription(prescriptionData) {
  const prescriptions = readPrescriptions();
  const newPrescription = { ...prescriptionData };
  prescriptions.push(newPrescription);
  writePrescriptions(prescriptions);
  return newPrescription;
}

export function updatePrescription(id, updates) {
  const prescriptions = readPrescriptions();
  const index = prescriptions.findIndex((prescription) => prescription.id === id);

  if (index === -1) return null;

  const updatedPrescription = { ...prescriptions[index], ...updates, id };
  prescriptions[index] = updatedPrescription;
  writePrescriptions(prescriptions);
  return updatedPrescription;
}

export function deletePrescription(id) {
  const prescriptions = readPrescriptions();
  const filtered = prescriptions.filter((prescription) => prescription.id !== id);

  if (filtered.length === prescriptions.length) {
    return { success: false, error: 'Prescription not found.' };
  }

  writePrescriptions(filtered);
  return { success: true };
}

export function searchPrescriptions(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return getAllPrescriptions();

  return getAllPrescriptions().filter((prescription) =>
    [prescription.patientName, prescription.diagnosis, prescription.notes]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(normalizedQuery))
  );
}

export function getRecentPrescriptions(limit = 5) {
  return getAllPrescriptions().slice(0, limit);
}
