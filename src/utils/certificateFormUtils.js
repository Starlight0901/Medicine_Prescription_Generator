import { resolveFieldDataType } from './certificateTemplateUtils';

export const SALUTATIONS = ['Mr.', 'Mrs.', 'Miss'];

const DOTTED_FIELD_KEYS = new Set(['patientName', 'medicalStatement']);

export function isDottedCertificateField(fieldKey) {
  return DOTTED_FIELD_KEYS.has(fieldKey);
}

export function getTemplateFieldKeys(template) {
  return new Set(
    (template?.blocks ?? [])
      .filter((block) => block.type === 'field')
      .map((block) => block.fieldKey)
  );
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return null;

  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function calculateCalendarDayDifference(startValue, endValue) {
  const start = parseCalendarDate(startValue);
  const end = parseCalendarDate(endValue);

  if (!start || !end) return null;

  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function formatCertificateDate(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';

  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year} / ${month} / ${day}`;
}

export function certificateSequenceKey(category, issueDate) {
  const date = parseCalendarDate(issueDate);
  const stamp = date
    ? `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
    : '000000';
  const prefix = category === 'medical-fitness' ? 'MF' : category === 'other' ? 'MO' : 'ML';

  return `${prefix}-${stamp}`;
}

export function formatCertificateNumber(sequenceKey, sequence) {
  const value = Number(sequence);

  if (!Number.isInteger(value) || value < 1) {
    return String(sequenceKey || '');
  }

  return `${sequenceKey}-${String(value).padStart(4, '0')}`;
}

export function buildCertificatePdfRequest(record) {
  const details = record?.details ?? {};
  const doctor = record?.doctorSnapshot ?? {};
  const issueDate = String(details.certificateDate || record?.issueDate || '');

  const snapshot = record?.templateSnapshot ?? {};

  return {
    template: {
      name: String(snapshot.name ?? ''),
      category: String(snapshot.category ?? 'other'),
      version: Number(snapshot.version) || 1,
      blocks: Array.isArray(snapshot.blocks) ? snapshot.blocks.map((block) => ({ ...block })) : [],
    },
    values: {
      salutation: String(details.salutation ?? ''),
      patientName: String(details.patientName ?? ''),
      certificateDate: issueDate,
      startDate: String(details.startDate ?? ''),
      endDate: String(details.endDate ?? ''),
      duration: details.duration == null || details.duration === ''
        ? null
        : (Number.isFinite(Number(details.duration)) ? Number(details.duration) : null),
      medicalStatement: String(details.medicalStatement ?? ''),
      doctorName: String(doctor.doctorName ?? details.doctorName ?? ''),
      clinicAddress: String(doctor.clinicAddress ?? details.clinicAddress ?? ''),
      clinicEmail: String(doctor.clinicEmail ?? details.clinicEmail ?? ''),
      fieldValues: mapStoredFieldValues(details.fieldValues),
    },
    settings: {
      doctorName: String(doctor.doctorName ?? details.doctorName ?? ''),
      clinicAddress: String(doctor.clinicAddress ?? details.clinicAddress ?? ''),
      clinicEmail: String(doctor.clinicEmail ?? details.clinicEmail ?? ''),
    },
    certificateNumber: String(record?.certificateNumber ?? ''),
  };
}

export function formatCalendarDate(value) {
  const date = parseCalendarDate(value);
  if (!date) return '';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function createCertificateValues(patient, settings) {
  return {
    salutation: '',
    patientName: String(patient?.name ?? ''),
    certificateDate: getLocalDateInputValue(),
    startDate: '',
    endDate: '',
    medicalStatement: '',
    doctorName: String(settings?.doctorName ?? ''),
    clinicAddress: String(settings?.clinicAddress ?? ''),
    clinicEmail: String(settings?.clinicEmail ?? ''),
    fieldValues: {},
  };
}

export function mapStoredFieldValues(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  return Object.entries(raw).reduce((values, [key, value]) => {
    if (value == null || value === '') return values;
    values[key] = String(value);
    return values;
  }, {});
}

export function formatCertificateFieldValue(dataType, raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  if (dataType === 'date') return formatCertificateDate(text);

  if (dataType === 'integer') {
    return /^-?\d+$/.test(text) ? text : '';
  }

  if (dataType === 'decimal' || dataType === 'currency') {
    if (!/^-?\d+(\.\d+)?$/.test(text)) return '';

    const sign = text.startsWith('-') ? '-' : '';
    const [whole, fraction = ''] = text.replace('-', '').split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const decimals = dataType === 'currency' ? `${fraction}00`.slice(0, 2) : fraction;
    const number = decimals ? `${sign}${grouped}.${decimals}` : `${sign}${grouped}`;
    return dataType === 'currency' ? `Rs. ${number}` : number;
  }

  return text;
}

function sampleValueForType(dataType) {
  switch (dataType) {
    case 'longText':
      return 'The patient was examined and may resume usual activity after rest.';
    case 'integer':
      return '3';
    case 'decimal':
      return '12.5';
    case 'date':
      return '2026-10-14';
    case 'currency':
      return '1500';
    default:
      return 'Sample text';
  }
}

export function createSampleCertificateValues(template, settings) {
  const values = createCertificateValues({ name: 'Amal Perera' }, {
    doctorName: settings?.doctorName || 'Dr. T Jayanthakumar',
    clinicAddress: settings?.clinicAddress || '12 Clinic Road',
    clinicEmail: settings?.clinicEmail || 'clinic@example.com',
  });
  values.salutation = 'Mr.';
  values.certificateDate = '2026-10-14';
  values.startDate = '2026-10-11';
  values.endDate = '2026-10-25';
  values.duration = 14;
  values.medicalStatement = 'Viral fever. Rest is advised for the period shown.';

  (template?.blocks ?? []).forEach((block) => {
    if (block.type === 'field' && block.custom) {
      values.fieldValues[block.fieldKey] = sampleValueForType(resolveFieldDataType(block));
    }
  });

  return values;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateCertificateEntry({ template, patient, values }) {
  const errors = {};
  const fieldKeys = getTemplateFieldKeys(template);
  const next = {
    salutation: String(values?.salutation ?? ''),
    patientName: String(values?.patientName ?? '').trim(),
    certificateDate: String(values?.certificateDate ?? ''),
    startDate: String(values?.startDate ?? ''),
    endDate: String(values?.endDate ?? ''),
    medicalStatement: String(values?.medicalStatement ?? '').trim(),
    doctorName: String(values?.doctorName ?? '').trim(),
    clinicAddress: String(values?.clinicAddress ?? '').trim(),
    clinicEmail: String(values?.clinicEmail ?? '').trim(),
  };

  if (!patient?.id) {
    errors.patient = 'Select a patient.';
  }

  if (!parseCalendarDate(next.certificateDate)) {
    errors.certificateDate = next.certificateDate
      ? 'Enter a valid issue date.'
      : 'Enter the issue date.';
  }

  if (fieldKeys.has('salutation') && !SALUTATIONS.includes(next.salutation)) {
    errors.salutation = 'Choose Mr., Mrs., or Miss.';
  }

  if (fieldKeys.has('patientName') && !next.patientName) {
    errors.patientName = 'Enter the name to print on the certificate.';
  }

  const startLabel = template?.blocks?.find((block) => block.fieldKey === 'startDate')?.label || 'Start date';
  const endLabel = template?.blocks?.find((block) => block.fieldKey === 'endDate')?.label || 'End date';

  if (fieldKeys.has('startDate')) {
    if (!next.startDate) {
      errors.startDate = `Enter ${startLabel}.`;
    } else if (!parseCalendarDate(next.startDate)) {
      errors.startDate = `Enter a valid date for ${startLabel}.`;
    }
  }

  if (fieldKeys.has('endDate')) {
    if (!next.endDate) {
      errors.endDate = `Enter ${endLabel}.`;
    } else if (!parseCalendarDate(next.endDate)) {
      errors.endDate = `Enter a valid date for ${endLabel}.`;
    }
  }

  const dayDifference = calculateCalendarDayDifference(next.startDate, next.endDate);

  if (
    fieldKeys.has('startDate')
    && fieldKeys.has('endDate')
    && !errors.startDate
    && !errors.endDate
    && dayDifference < 0
  ) {
    errors.endDate = 'The end date cannot be earlier than the start date.';
  }

  if (fieldKeys.has('medicalStatement') && !next.medicalStatement) {
    errors.medicalStatement = 'Enter the illness or medical statement.';
  }

  if (fieldKeys.has('doctorName') && !next.doctorName) {
    errors.doctorName = 'Enter the doctor name for this certificate.';
  }

  if (fieldKeys.has('clinicEmail') && next.clinicEmail && !isValidEmail(next.clinicEmail)) {
    errors.clinicEmail = 'Enter a valid clinic email.';
  }

  const fieldValues = {};

  (template?.blocks ?? []).forEach((block) => {
    if (block.type !== 'field' || !block.custom) return;

    const label = block.label || 'This field';
    const raw = String(values?.fieldValues?.[block.fieldKey] ?? values?.[block.fieldKey] ?? '').trim();
    const dataType = resolveFieldDataType(block);

    if (!raw) {
      fieldValues[block.fieldKey] = '';
      if (block.required) errors[block.fieldKey] = `Enter ${label}.`;
      return;
    }

    if (dataType === 'integer' && !/^-?\d+$/.test(raw)) {
      errors[block.fieldKey] = `${label} must be a whole number.`;
    } else if ((dataType === 'decimal' || dataType === 'currency') && !/^-?\d+(\.\d+)?$/.test(raw)) {
      errors[block.fieldKey] = `${label} must be a number.`;
    } else if (dataType === 'date' && !parseCalendarDate(raw)) {
      errors[block.fieldKey] = `Enter a valid date for ${label}.`;
    }

    fieldValues[block.fieldKey] = raw;
  });

  const duration = dayDifference != null && dayDifference >= 0 && !errors.startDate && !errors.endDate
    ? dayDifference
    : null;

  return {
    errors,
    value: {
      ...next,
      duration,
      fieldValues,
    },
  };
}
