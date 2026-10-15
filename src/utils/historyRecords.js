import { parseCalendarDate } from './certificateFormUtils';
import { getCategoryLabel } from './certificateTemplateUtils';

export const MEDICAL_CERTIFICATE_TYPE = 'medical-certificate';

function toIsoString(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function certificateHistoryDate(certificate) {
  const rawIssue = String(
    certificate?.issueDate
    || certificate?.details?.certificateDate
    || ''
  ).trim();
  const calendarDate = rawIssue.slice(0, 10);

  if (parseCalendarDate(calendarDate)) {
    return `${calendarDate}T12:00:00`;
  }

  return toIsoString(certificate?.issuedAt)
    || toIsoString(certificate?.createdAt)
    || toIsoString(rawIssue);
}

export function certificateTemplateName(certificate) {
  const snapshotName = String(certificate?.templateSnapshot?.name ?? '').trim();
  if (snapshotName) return snapshotName;

  const category = certificate?.certificateType || certificate?.templateSnapshot?.category;
  return getCategoryLabel(category);
}

export function certificateLeaveDays(certificate) {
  const duration = certificate?.details?.duration ?? certificate?.duration;
  if (duration == null || duration === '') return null;

  const days = Number(duration);
  return Number.isFinite(days) ? days : null;
}

export function toCertificateHistoryRecord(certificate) {
  const patientName = String(
    certificate?.patientName
    || certificate?.details?.patientName
    || certificate?.patientSnapshot?.name
    || ''
  ).trim();

  return {
    id: String(certificate?.id ?? ''),
    recordKind: MEDICAL_CERTIFICATE_TYPE,
    type: MEDICAL_CERTIFICATE_TYPE,
    patientId: String(certificate?.patientId || certificate?.patientSnapshot?.id || ''),
    patientName: patientName || '—',
    templateName: certificateTemplateName(certificate),
    certificateType: String(
      certificate?.certificateType
      || certificate?.templateSnapshot?.category
      || 'other'
    ),
    medicalStatement: String(certificate?.details?.medicalStatement ?? ''),
    duration: certificateLeaveDays(certificate),
    createdAt: certificateHistoryDate(certificate),
    certificate,
  };
}

export function isMedicalCertificateRecord(record) {
  return record?.recordKind === MEDICAL_CERTIFICATE_TYPE || record?.type === MEDICAL_CERTIFICATE_TYPE;
}
