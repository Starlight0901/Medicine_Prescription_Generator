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
} from './prescriptionsService';
import { getSettings as readSettings, saveSettings } from './settingsService';

/**
 * Unified async data access facade for UI components.
 * Swap underlying service implementations for Firebase without changing consumers.
 */

export async function getPatients() {
  return getAllPatients();
}

export async function savePatient(patient) {
  if (patient?.id) {
    return updatePatient(patient.id, patient);
  }

  return createPatient(patient);
}

export async function deletePatient(id) {
  return deletePatientRecord(id);
}

export async function getPrescriptions() {
  return getAllPrescriptions();
}

export async function savePrescription(prescription) {
  if (prescription?.id && (await getPrescriptionById(prescription.id))) {
    const updated = await updatePrescription(prescription.id, prescription);

    if (!updated) {
      return { success: false, error: 'Prescription not found.' };
    }

    return { success: true, data: updated };
  }

  const created = await createPrescription(prescription);
  return { success: true, data: created };
}

export async function deletePrescription(id) {
  return deletePrescriptionRecord(id);
}

export async function getSettings() {
  return readSettings();
}

export async function updateSettings(settingsInput) {
  return saveSettings(settingsInput);
}
