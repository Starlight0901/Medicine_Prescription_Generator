import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { getCertificateTemplateById } from './certificateTemplatesService';
import { getPatientById } from './patientsService';
import { readStoredSnapshot, snapshotTemplate } from '../utils/certificateTemplateUtils';
import {
  certificateSequenceKey,
  formatCertificateNumber,
  validateCertificateEntry,
} from '../utils/certificateFormUtils';
import { db } from './firebase';

const certificatesCollection = collection(db, 'medicalCertificates');

function mapFirestoreError(error) {
  if (error?.code === 'permission-denied') {
    return 'You do not have permission to access medical certificates. Deploy the updated Firestore rules, then try again.';
  }

  return error?.message || 'Failed to access medical certificates. Please try again.';
}

function resolveTimestamp(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString();
}

function mapDuration(value) {
  if (value == null || value === '') return null;

  const duration = Number(value);
  return Number.isFinite(duration) ? duration : null;
}

function mapFieldValues(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  return Object.entries(raw).reduce((values, [key, value]) => {
    if (value == null || value === '') return values;
    values[key] = String(value);
    return values;
  }, {});
}

function mapDetails(raw) {
  return {
    salutation: String(raw?.salutation ?? ''),
    patientName: String(raw?.patientName ?? ''),
    certificateDate: String(raw?.certificateDate ?? ''),
    startDate: String(raw?.startDate ?? ''),
    endDate: String(raw?.endDate ?? ''),
    duration: mapDuration(raw?.duration),
    medicalStatement: String(raw?.medicalStatement ?? ''),
    doctorName: String(raw?.doctorName ?? ''),
    clinicAddress: String(raw?.clinicAddress ?? ''),
    clinicEmail: String(raw?.clinicEmail ?? ''),
    fieldValues: mapFieldValues(raw?.fieldValues),
  };
}

function mapPatientSnapshot(raw, fallbackName = '') {
  const birthYear = Number(raw?.birthYear);

  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? fallbackName),
    birthYear: Number.isFinite(birthYear) ? birthYear : null,
    gender: String(raw?.gender ?? ''),
    phone: String(raw?.phone ?? ''),
  };
}

function mapDoctorSnapshot(raw) {
  return {
    doctorName: String(raw?.doctorName ?? ''),
    clinicAddress: String(raw?.clinicAddress ?? ''),
    clinicEmail: String(raw?.clinicEmail ?? ''),
  };
}

function mapCertificate(snapshot) {
  const data = snapshot.data() ?? {};
  const templateSnapshot = readStoredSnapshot(data.templateSnapshot);
  const details = mapDetails(data.details);
  const patientSnapshot = mapPatientSnapshot(data.patientSnapshot, data.patientName);
  const doctorSnapshot = mapDoctorSnapshot(data.doctorSnapshot ?? data.details);
  const printedName = details.patientName || patientSnapshot.name || String(data.patientName ?? '');

  return {
    id: snapshot.id,
    certificateNumber: String(data.certificateNumber ?? ''),
    patientId: String(data.patientId ?? patientSnapshot.id),
    patientName: printedName,
    patientSnapshot,
    certificateType: String(data.certificateType ?? templateSnapshot.category ?? 'other'),
    templateId: String(data.templateId ?? ''),
    templateSnapshot,
    details,
    doctorSnapshot,
    issueDate: String(data.issueDate ?? details.certificateDate ?? ''),
    issuedAt: resolveTimestamp(data.issuedAt),
    createdAt: resolveTimestamp(data.createdAt),
    canRegenerate: Boolean(
      data.certificateNumber
      && data.templateSnapshot
      && data.details
      && data.doctorSnapshot
    ),
  };
}

async function loadMedicalCertificates(constraints) {
  try {
    const certificatesQuery = query(certificatesCollection, ...constraints);
    const snapshot = await getDocs(certificatesQuery);

    return {
      success: true,
      data: snapshot.docs.map(mapCertificate),
    };
  } catch (error) {
    console.error('Failed to load medical certificates from Firestore:', error);
    return {
      success: false,
      error: mapFirestoreError(error),
      data: [],
    };
  }
}

export async function getAllMedicalCertificates() {
  try {
    const snapshot = await getDocs(certificatesCollection);

    return {
      success: true,
      data: snapshot.docs.map(mapCertificate),
    };
  } catch (error) {
    console.error('Failed to load medical certificates from Firestore:', error);
    return {
      success: false,
      error: mapFirestoreError(error),
      data: [],
    };
  }
}

export async function getRecentMedicalCertificates(count = 5) {
  const size = Number.isInteger(count) && count > 0 ? count : 5;
  return loadMedicalCertificates([orderBy('issuedAt', 'desc'), limit(size)]);
}

export async function countMedicalCertificates() {
  try {
    const snapshot = await getCountFromServer(certificatesCollection);

    return {
      success: true,
      data: snapshot.data().count,
    };
  } catch (error) {
    console.error('Failed to count medical certificates:', error);
    return {
      success: false,
      error: mapFirestoreError(error),
      data: null,
    };
  }
}

export async function deleteMedicalCertificate(id) {
  const certificateRef = doc(db, 'medicalCertificates', id);

  try {
    const snapshot = await getDoc(certificateRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Medical certificate not found.' };
    }

    await deleteDoc(certificateRef);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete medical certificate:', error);
    return {
      success: false,
      error: error?.code === 'permission-denied'
        ? 'You do not have permission to delete this medical certificate.'
        : (error?.message || 'Could not delete the medical certificate. Check your connection and try again.'),
    };
  }
}

function buildCertificatePayload({
  requestId,
  certificateNumber,
  patient,
  template,
  templateSnapshot,
  value,
  savedAt,
}) {
  return {
    certificateNumber,
    clientRequestId: requestId,
    patientId: patient.id,
    patientSnapshot: {
      id: patient.id,
      name: String(patient.name ?? ''),
      birthYear: Number.isFinite(Number(patient.birthYear)) ? Number(patient.birthYear) : null,
      gender: String(patient.gender ?? ''),
      phone: String(patient.phone ?? ''),
    },
    certificateType: template.category,
    templateId: template.id,
    templateSnapshot,
    details: {
      salutation: value.salutation,
      patientName: value.patientName,
      certificateDate: value.certificateDate,
      startDate: value.startDate,
      endDate: value.endDate,
      duration: value.duration == null ? null : value.duration,
      medicalStatement: value.medicalStatement,
      doctorName: value.doctorName,
      clinicAddress: value.clinicAddress,
      clinicEmail: value.clinicEmail,
      fieldValues: mapFieldValues(value.fieldValues),
    },
    doctorSnapshot: {
      doctorName: value.doctorName,
      clinicAddress: value.clinicAddress,
      clinicEmail: value.clinicEmail,
    },
    issueDate: value.certificateDate,
    issuedAt: savedAt,
    createdAt: savedAt,
  };
}

export async function issueMedicalCertificate({
  clientRequestId,
  patientId,
  templateId,
  values,
}) {
  const requestId = String(clientRequestId ?? '').trim();

  if (!requestId || requestId.includes('/')) {
    return { success: false, error: 'The certificate request could not be identified.' };
  }

  if (!patientId) {
    return { success: false, error: 'Select a patient before issuing a certificate.' };
  }

  if (!templateId) {
    return { success: false, error: 'Select a template before issuing a certificate.' };
  }

  try {
    const [patient, template] = await Promise.all([
      getPatientById(patientId),
      getCertificateTemplateById(templateId),
    ]);

    if (!patient) {
      return { success: false, error: 'Patient not found.' };
    }

    if (!template) {
      return { success: false, error: 'Template not found.' };
    }

    const validation = validateCertificateEntry({ template, patient, values });

    if (Object.keys(validation.errors).length > 0) {
      return {
        success: false,
        errors: validation.errors,
        error: 'Complete the certificate before issuing it.',
      };
    }

    const templateSnapshot = snapshotTemplate(template);
    const sequenceKey = certificateSequenceKey(template.category, validation.value.certificateDate);
    const certificateRef = doc(db, 'medicalCertificates', requestId);
    const counterRef = doc(db, 'certificateCounters', sequenceKey);
    const outcome = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(certificateRef);

      if (existing.exists()) {
        return 'existing';
      }

      const counter = await transaction.get(counterRef);
      const last = Number(counter.data()?.last) || 0;
      const next = last + 1;
      const savedAt = Timestamp.fromDate(new Date());

      transaction.set(counterRef, {
        last: next,
        updatedAt: savedAt,
      });
      transaction.set(certificateRef, buildCertificatePayload({
        requestId,
        certificateNumber: formatCertificateNumber(sequenceKey, next),
        patient,
        template,
        templateSnapshot,
        value: validation.value,
        savedAt,
      }));

      return 'created';
    });

    const snapshot = await getDoc(certificateRef);

    return {
      success: true,
      duplicate: outcome === 'existing',
      data: mapCertificate(snapshot),
    };
  } catch (error) {
    console.error('Failed to issue medical certificate in Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}
