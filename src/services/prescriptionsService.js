import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { toISODateString } from '../utils/dateUtils';
import { db } from './firebase';

const prescriptionsCollection = collection(db, 'prescriptions');

const DOCUMENT_TYPES = ['prescription', 'referral', 'investigation'];

function normalizeDocumentType(value) {
  const type = String(value ?? 'prescription').toLowerCase();

  return DOCUMENT_TYPES.includes(type) ? type : 'prescription';
}

function normalizeMedicine(medicine) {
  return {
    name: String(medicine?.name ?? ''),
    dosage: String(medicine?.dosage ?? ''),
    frequency: String(medicine?.frequency ?? ''),
    duration: String(medicine?.duration ?? ''),
  };
}

function normalizeCreatedAt(value) {
  if (!value) {
    return toISODateString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return toISODateString();
  }

  return date.toISOString();
}

function normalizeInvestigations(investigations) {
  if (!Array.isArray(investigations)) {
    return [];
  }

  return investigations.map((item) => String(item ?? ''));
}

function normalizePrescription(p) {
  const type = normalizeDocumentType(p?.type);

  return {
    id: String(p?.id ?? ''),
    type,
    patientId: String(p?.patientId ?? ''),
    patientName: String(p?.patientName ?? ''),
    createdAt: normalizeCreatedAt(p?.createdAt),
    diagnosis: String(p?.diagnosis ?? ''),
    medicines: Array.isArray(p?.medicines)
      ? p.medicines.map(normalizeMedicine)
      : [],
    notes: String(p?.notes ?? ''),
    referralTitle: String(p?.referralTitle ?? ''),
    referralContent: String(p?.referralContent ?? ''),
    investigationNotes: String(p?.investigationNotes ?? ''),
    investigations: normalizeInvestigations(p?.investigations),
  };
}

function compareCreatedAtDesc(a, b) {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const aValue = Number.isFinite(aTime) ? aTime : 0;
  const bValue = Number.isFinite(bTime) ? bTime : 0;

  return bValue - aValue;
}

function resolveCreatedAt(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  return value;
}

function mapFirestoreDoc(snapshot) {
  const data = snapshot.data();

  return normalizePrescription({
    id: snapshot.id,
    type: data.type,
    patientId: data.patientId,
    patientName: data.patientName,
    createdAt: resolveCreatedAt(data.createdAt),
    diagnosis: data.diagnosis,
    medicines: data.medicines,
    notes: data.notes,
    referralTitle: data.referralTitle,
    referralContent: data.referralContent,
    investigationNotes: data.investigationNotes,
    investigations: data.investigations,
  });
}

function getNonEmptyMedicines(medicines) {
  return (medicines ?? [])
    .filter((medicine) => String(medicine?.name ?? '').trim())
    .map(normalizeMedicine);
}

function getNonEmptyInvestigations(investigations) {
  return (investigations ?? [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function buildPrescriptionFields(prescription) {
  const fields = {
    patientId: prescription.patientId,
    patientName: prescription.patientName,
    type: prescription.type,
  };

  if (prescription.type === 'referral') {
    return {
      ...fields,
      referralTitle: prescription.referralTitle,
      referralContent: prescription.referralContent,
    };
  }

  if (prescription.type === 'investigation') {
    const filteredMedicines = getNonEmptyMedicines(prescription.medicines);
    const investigationFields = {
      ...fields,
      investigationNotes: prescription.investigationNotes,
      investigations: getNonEmptyInvestigations(prescription.investigations),
    };

    if (filteredMedicines.length > 0) {
      investigationFields.medicines = filteredMedicines;
    }

    return investigationFields;
  }

  return {
    ...fields,
    diagnosis: prescription.diagnosis,
    medicines: prescription.medicines,
    notes: prescription.notes,
  };
}

function buildFieldsToClear(type) {
  const clears = {};

  if (type === 'referral') {
    clears.diagnosis = deleteField();
    clears.medicines = deleteField();
    clears.notes = deleteField();
    clears.investigationNotes = deleteField();
    clears.investigations = deleteField();
    return clears;
  }

  if (type === 'investigation') {
    clears.diagnosis = deleteField();
    clears.notes = deleteField();
    clears.referralTitle = deleteField();
    clears.referralContent = deleteField();
    return clears;
  }

  clears.referralTitle = deleteField();
  clears.referralContent = deleteField();
  clears.investigationNotes = deleteField();
  clears.investigations = deleteField();
  return clears;
}

function mapFirestoreError(error) {
  return error?.message || 'Failed to access prescriptions. Please try again.';
}

export async function getAllPrescriptions() {
  try {
    const prescriptionsQuery = query(
      prescriptionsCollection,
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(prescriptionsQuery);
    return snapshot.docs.map(mapFirestoreDoc).sort(compareCreatedAtDesc);
  } catch (error) {
    console.error('Failed to load prescriptions from Firestore:', error);
    return [];
  }
}

export async function getPrescriptionById(id) {
  try {
    const snapshot = await getDoc(doc(db, 'prescriptions', id));

    if (!snapshot.exists()) {
      return null;
    }

    return mapFirestoreDoc(snapshot);
  } catch (error) {
    console.error('Failed to load prescription from Firestore:', error);
    return null;
  }
}

export async function getPrescriptionsByPatientId(patientId) {
  const prescriptions = await getAllPrescriptions();
  return prescriptions.filter(
    (prescription) => prescription.patientId === patientId
  );
}

export async function createPrescription(prescriptionData) {
  const newPrescription = normalizePrescription(prescriptionData);
  const fields = buildPrescriptionFields(newPrescription);

  if (newPrescription.id) {
    const prescriptionRef = doc(db, 'prescriptions', newPrescription.id);
    await setDoc(prescriptionRef, {
      ...fields,
      createdAt: serverTimestamp(),
    });

    const snapshot = await getDoc(prescriptionRef);
    return mapFirestoreDoc(snapshot);
  }

  const docRef = await addDoc(prescriptionsCollection, {
    ...fields,
    createdAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  return mapFirestoreDoc(snapshot);
}

export async function updatePrescription(id, updates) {
  const prescriptionRef = doc(db, 'prescriptions', id);

  try {
    const snapshot = await getDoc(prescriptionRef);

    if (!snapshot.exists()) {
      return null;
    }

    const existing = mapFirestoreDoc(snapshot);
    const updatedPrescription = normalizePrescription({
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
    });

    await updateDoc(prescriptionRef, {
      ...buildPrescriptionFields(updatedPrescription),
      ...buildFieldsToClear(updatedPrescription.type),
      ...(updatedPrescription.type === 'investigation' &&
      getNonEmptyMedicines(updatedPrescription.medicines).length === 0
        ? { medicines: deleteField() }
        : {}),
    });

    return updatedPrescription;
  } catch (error) {
    console.error('Failed to update prescription in Firestore:', error);
    return null;
  }
}

export async function deletePrescription(id) {
  const prescriptionRef = doc(db, 'prescriptions', id);

  try {
    const snapshot = await getDoc(prescriptionRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Prescription not found.' };
    }

    await deleteDoc(prescriptionRef);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete prescription from Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}
