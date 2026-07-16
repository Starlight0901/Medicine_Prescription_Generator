import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { toISODateString } from '../utils/dateUtils';
import {
  buildPatientPayload,
  normalizePatientInput,
  resolveBirthYearFromPatientData,
  validatePatientInput,
} from '../utils/patientUtils';
import { db } from './firebase';

const patientsCollection = collection(db, 'patients');

function mapFirestoreError(error) {
  return error?.message || 'Failed to access patients. Please try again.';
}

function mapPatientDoc(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name ?? '',
    birthYear: resolveBirthYearFromPatientData(data),
    gender: data.gender ?? '',
    phone: String(data.phone ?? '').trim(),
    createdAt: data.createdAt ?? '',
  };
}

export async function getAllPatients() {
  try {
    const patientsQuery = query(patientsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(patientsQuery);
    return snapshot.docs.map(mapPatientDoc);
  } catch (error) {
    console.error('Failed to load patients from Firestore:', error);
    return [];
  }
}

export async function createPatient(patientInput) {
  const patient = normalizePatientInput(patientInput);
  const errors = validatePatientInput(patient);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const createdAt = toISODateString();
  const payload = buildPatientPayload({
    name: patient.name,
    birthYear: patient.birthYear,
    gender: patient.gender,
    phone: patient.phone,
    createdAt,
  });

  try {
    const docRef = await addDoc(patientsCollection, payload);
    const newPatient = { id: docRef.id, ...payload };
    return { success: true, data: newPatient };
  } catch (error) {
    console.error('Failed to create patient in Firestore:', error);
    return {
      success: false,
      errors: { form: mapFirestoreError(error) },
    };
  }
}

export async function updatePatient(id, patientInput) {
  const patient = normalizePatientInput(patientInput);
  const errors = validatePatientInput(patient);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const patientRef = doc(db, 'patients', id);

  try {
    const snapshot = await getDoc(patientRef);

    if (!snapshot.exists()) {
      return { success: false, errors: { form: 'Patient not found.' } };
    }

    const existing = mapPatientDoc(snapshot);
    const payload = buildPatientPayload({
      name: patient.name,
      birthYear: patient.birthYear,
      gender: patient.gender,
      phone: patient.phone,
      createdAt: existing.createdAt,
    });

    await updateDoc(patientRef, payload);

    return { success: true, data: { id, ...payload } };
  } catch (error) {
    console.error('Failed to update patient in Firestore:', error);
    return {
      success: false,
      errors: { form: mapFirestoreError(error) },
    };
  }
}

export async function deletePatient(id) {
  const patientRef = doc(db, 'patients', id);

  try {
    const snapshot = await getDoc(patientRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Patient not found.' };
    }

    await deleteDoc(patientRef);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete patient from Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}

export async function getPatientById(id) {
  try {
    const patientRef = doc(db, 'patients', id);
    const snapshot = await getDoc(patientRef);
    if (!snapshot.exists()) {
      return null;
    }
    return mapPatientDoc(snapshot);
  } catch (error) {
    console.error('Failed to get patient by ID:', error);
    return null;
  }
}

export async function searchPatients(queryText) {
  try {
    const patients = await getAllPatients();
    if (!queryText) {
      return patients;
    }
    const cleanQuery = String(queryText).toLowerCase().trim();
    return patients.filter((patient) =>
      patient.name.toLowerCase().includes(cleanQuery) ||
      (patient.phone && patient.phone.toLowerCase().includes(cleanQuery))
    );
  } catch (error) {
    console.error('Failed to search patients:', error);
    return [];
  }
}
