import {
  createPatient,
  deletePatient as deletePatientRecord,
  getAllPatients,
  updatePatient,
} from './patientsService';
import {
  createPrescription,
  deletePrescription as deletePrescriptionRecord,
  getAllPrescriptions,
  getPrescriptionById,
  updatePrescription,
} from './prescriptionService';
import { getSettings as readSettings, saveSettings } from './settingsService';

/**
 * Unified data access layer.
 * UI must use these methods only — swap implementation for Firebase later.
 */

export function getPatients() {
  return getAllPatients();
}

export function savePatient(patient) {
  if (patient?.id) {
    return updatePatient(patient.id, patient);
  }

  return createPatient(patient);
}

export function deletePatient(id) {
  return deletePatientRecord(id);
}

export function getPrescriptions() {
  return getAllPrescriptions();
}

export function savePrescription(prescription) {
  if (prescription?.id && getPrescriptionById(prescription.id)) {
    const updated = updatePrescription(prescription.id, prescription);

    if (!updated) {
      return { success: false, error: 'Prescription not found.' };
    }

    return { success: true, data: updated };
  }

  const created = createPrescription(prescription);
  return { success: true, data: created };
}

export function deletePrescription(id) {
  return deletePrescriptionRecord(id);
}

export function getSettings() {
  return readSettings();
}

export function updateSettings(settingsInput) {
  return saveSettings(settingsInput);
}
