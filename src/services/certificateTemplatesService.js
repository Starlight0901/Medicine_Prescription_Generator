import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { DEFAULT_CERTIFICATE_TEMPLATES } from '../data/certificateTemplateDefaults';
import {
  normalizeBlocks,
  serializeBlock,
  validateTemplateInput,
} from '../utils/certificateTemplateUtils';
import { db } from './firebase';

const templatesCollection = collection(db, 'certificateTemplates');

function mapFirestoreError(error) {
  if (error?.code === 'permission-denied') {
    return 'You do not have permission to access certificate templates. Deploy the updated Firestore rules, then try again.';
  }

  return error?.message || 'Failed to access certificate templates. Please try again.';
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

function mapTemplate(snapshot) {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    category: String(data.category ?? 'other'),
    version: Number(data.version) || 1,
    blocks: normalizeBlocks(data.blocks).map(serializeBlock),
    createdAt: resolveTimestamp(data.createdAt),
    updatedAt: resolveTimestamp(data.updatedAt),
  };
}

async function ensureDefaultTemplates() {
  const existing = await getDocs(templatesCollection);
  if (!existing.empty) return;

  const now = Timestamp.fromDate(new Date());

  await Promise.all(
    DEFAULT_CERTIFICATE_TEMPLATES.map((template) =>
      setDoc(doc(db, 'certificateTemplates', template.id), {
        name: template.name,
        category: template.category,
        version: 1,
        blocks: normalizeBlocks(template.blocks).map(serializeBlock),
        createdAt: now,
        updatedAt: now,
      })
    )
  );
}

export async function getAllCertificateTemplates() {
  try {
    await ensureDefaultTemplates();
    const templatesQuery = query(templatesCollection, orderBy('name'));
    const snapshot = await getDocs(templatesQuery);

    return {
      success: true,
      data: snapshot.docs.map(mapTemplate),
    };
  } catch (error) {
    console.error('Failed to load certificate templates from Firestore:', error);
    return {
      success: false,
      error: mapFirestoreError(error),
      data: [],
    };
  }
}

export async function getCertificateTemplateById(id) {
  try {
    const snapshot = await getDoc(doc(db, 'certificateTemplates', id));
    if (!snapshot.exists()) return null;
    return mapTemplate(snapshot);
  } catch (error) {
    console.error('Failed to load certificate template from Firestore:', error);
    return null;
  }
}

export async function createCertificateTemplate(input) {
  const { errors, value } = validateTemplateInput(input);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const templateRef = doc(templatesCollection);
    const now = serverTimestamp();

    await setDoc(templateRef, {
      name: value.name,
      category: value.category,
      version: 1,
      blocks: value.blocks,
      createdAt: now,
      updatedAt: now,
    });

    const snapshot = await getDoc(templateRef);
    return { success: true, data: mapTemplate(snapshot) };
  } catch (error) {
    console.error('Failed to create certificate template in Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}

export async function updateCertificateTemplate(id, input) {
  const { errors, value } = validateTemplateInput(input);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const templateRef = doc(db, 'certificateTemplates', id);

  try {
    const snapshot = await getDoc(templateRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Template not found.' };
    }

    const currentVersion = Number(snapshot.data().version) || 1;

    await updateDoc(templateRef, {
      name: value.name,
      category: value.category,
      version: currentVersion + 1,
      blocks: value.blocks,
      updatedAt: serverTimestamp(),
    });

    const updated = await getDoc(templateRef);
    return { success: true, data: mapTemplate(updated) };
  } catch (error) {
    console.error('Failed to update certificate template in Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}

export async function deleteCertificateTemplate(id) {
  const templateRef = doc(db, 'certificateTemplates', id);

  try {
    const snapshot = await getDoc(templateRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Template not found.' };
    }

    await deleteDoc(templateRef);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete certificate template from Firestore:', error);
    return { success: false, error: mapFirestoreError(error) };
  }
}
