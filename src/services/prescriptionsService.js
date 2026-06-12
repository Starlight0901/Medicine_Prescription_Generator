import {
  addDoc,
  collection,
  deleteDoc,
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

function normalizePrescription(p) {
  return {
    id: String(p?.id ?? ''),
    patientId: String(p?.patientId ?? ''),
    patientName: String(p?.patientName ?? ''),
    diagnosis: String(p?.diagnosis ?? ''),
    medicines: Array.isArray(p?.medicines)
      ? p.medicines.map(normalizeMedicine)
      : [],
    notes: String(p?.notes ?? ''),
    createdAt: normalizeCreatedAt(p?.createdAt),
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
    patientId: data.patientId,
    patientName: data.patientName,
    diagnosis: data.diagnosis,
    medicines: data.medicines,
    notes: data.notes,
    createdAt: resolveCreatedAt(data.createdAt),
  });
}

function buildPrescriptionFields(prescription) {
  return {
    patientId: prescription.patientId,
    patientName: prescription.patientName,
    diagnosis: prescription.diagnosis,
    medicines: prescription.medicines,
    notes: prescription.notes,
  };
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

    await updateDoc(prescriptionRef, buildPrescriptionFields(updatedPrescription));

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
