import {
  createPatient,
  deletePatient as deletePatientRecord,
  getAllPatients,
  getPatientById as getPatientRecordById,
  searchPatients as searchPatientRecords,
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
import {
  createCertificateTemplate,
  deleteCertificateTemplate,
  getAllCertificateTemplates,
  updateCertificateTemplate,
} from './certificateTemplatesService';
import {
  countMedicalCertificates as fetchMedicalCertificateCount,
  deleteMedicalCertificate as deleteMedicalCertificateRecord,
  getAllMedicalCertificates as fetchAllMedicalCertificates,
  getRecentMedicalCertificates,
  issueMedicalCertificate,
} from './medicalCertificatesService';

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

export async function getPatientById(id) {
  return getPatientRecordById(id);
}

export async function searchPatients(queryText) {
  return searchPatientRecords(queryText);
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

export async function getCertificateTemplates() {
  return getAllCertificateTemplates();
}

export async function saveCertificateTemplate(template) {
  if (template?.id) {
    return updateCertificateTemplate(template.id, template);
  }

  return createCertificateTemplate(template);
}

export async function deleteCertificateTemplateById(id) {
  return deleteCertificateTemplate(id);
}

export async function getMedicalCertificates(count = 5) {
  return getRecentMedicalCertificates(count);
}

export async function getMedicalCertificateCount() {
  return fetchMedicalCertificateCount();
}

export async function deleteMedicalCertificate(id) {
  return deleteMedicalCertificateRecord(id);
}

export async function getAllMedicalCertificates() {
  return fetchAllMedicalCertificates();
}

export async function issueCertificate(certificate) {
  return issueMedicalCertificate(certificate);
}
