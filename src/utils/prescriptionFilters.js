import { isMedicalCertificateRecord } from './historyRecords';
import { resolveDocumentType } from './prescriptionFormUtils';

function historyTime(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortByNewestFirst(items, dateField = 'createdAt') {
  return [...items].sort(
    (a, b) => historyTime(b[dateField]) - historyTime(a[dateField])
  );
}

export function filterByPatientName(items, query, nameField = 'patientName') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) =>
    String(item[nameField] ?? '')
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export function getDateParts(isoString) {
  if (!isoString) return null;

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function matchesDateFilter(isoString, { day = '', month = '', year = '' } = {}) {
  const parts = getDateParts(isoString);
  if (!parts) return false;

  if (year && parts.year !== Number(year)) return false;
  if (month && parts.month !== Number(month)) return false;
  if (day && parts.day !== Number(day)) return false;

  return true;
}

export function filterByDate(items, dateFilter, dateField = 'createdAt') {
  const hasFilter = Boolean(dateFilter.day || dateFilter.month || dateFilter.year);
  if (!hasFilter) return items;

  return items.filter((item) => matchesDateFilter(item[dateField], dateFilter));
}

export function historyDocumentType(item) {
  if (isMedicalCertificateRecord(item)) return 'medical-certificate';

  return resolveDocumentType(item?.type);
}

export function matchesHistorySearch(item, query) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  if (!normalizedQuery) return true;

  const fields = [item?.patientName];

  if (isMedicalCertificateRecord(item)) {
    fields.push(item.templateName, item.medicalStatement);
  }

  return fields.some((field) => String(field ?? '').toLowerCase().includes(normalizedQuery));
}

export function filterByDocumentType(items, documentType) {
  if (!documentType) return items;

  return items.filter((item) => historyDocumentType(item) === documentType);
}

export function applyPrescriptionFilters(
  items,
  {
    searchQuery = '',
    dateFilter = { day: '', month: '', year: '' },
    documentTypeFilter = '',
  } = {}
) {
  const filtered = filterByDate(
    filterByDocumentType(
      items.filter((item) => matchesHistorySearch(item, searchQuery)),
      documentTypeFilter
    ),
    dateFilter
  );

  return sortByNewestFirst(filtered);
}

export function extractDateFilterOptions(items, dateField = 'createdAt') {
  const years = new Set();
  const months = new Set();
  const days = new Set();

  items.forEach((item) => {
    const parts = getDateParts(item[dateField]);
    if (!parts) return;

    years.add(parts.year);
    months.add(parts.month);
    days.add(parts.day);
  });

  return {
    years: [...years].sort((a, b) => b - a),
    months: [...months].sort((a, b) => a - b),
    days: [...days].sort((a, b) => a - b),
  };
}

export function getPrescriptionPreview(prescription, maxLength = 80) {
  if (isMedicalCertificateRecord(prescription)) {
    const text = String(prescription.medicalStatement ?? '').replace(/\s+/g, ' ').trim()
      || 'Medical certificate';

    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}…`;
  }

  if (prescription.type === 'referral') {
    const parts = [prescription.referralTitle, prescription.referralContent].filter(Boolean);
    const text = parts.join(' · ') || 'Referral letter';

    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}…`;
  }

  if (prescription.type === 'investigation') {
    const investigationItems = (prescription.investigations ?? [])
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .join(', ');
    const parts = [prescription.investigationNotes, investigationItems].filter(Boolean);
    const text = parts.join(' · ') || 'Investigation request';

    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}…`;
  }

  const medicineNames = (prescription.medicines ?? [])
    .map((medicine) => medicine.name)
    .filter(Boolean)
    .join(', ');

  const parts = [prescription.diagnosis, medicineNames, prescription.notes].filter(Boolean);
  const text = parts.join(' · ');

  if (text.length <= maxLength) return text || 'No details available.';
  return `${text.slice(0, maxLength).trim()}…`;
}

export const EMPTY_DATE_FILTER = {
  day: '',
  month: '',
  year: '',
};

export const DOCUMENT_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Documents' },
  { value: 'prescription', label: 'Prescriptions' },
  { value: 'referral', label: 'Referral Letters' },
  { value: 'investigation', label: 'Investigations' },
  { value: 'medical-certificate', label: 'Medical Certificates' },
];
