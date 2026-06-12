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
import { db } from './firebase';

const patientsCollection = collection(db, 'patients');

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

function mapFirestoreError(error) {
  return error?.message || 'Failed to access patients. Please try again.';
}

function mapPatientDoc(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: data.name ?? '',
    dateOfBirth: data.dateOfBirth ?? '',
    gender: data.gender ?? '',
    phone: String(data.phone ?? '').trim(),
    createdAt: data.createdAt ?? '',
  };
}

function buildPatientPayload(patient) {
  return {
    name: patient.name,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    phone: patient.phone,
    createdAt: patient.createdAt,
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
  const payload = buildPatientPayload({ ...patient, createdAt });

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
      ...patient,
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
