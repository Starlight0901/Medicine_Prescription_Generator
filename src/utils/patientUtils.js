import { calculateAgeFromBirthYear } from './dateUtils';

export const MIN_AGE = 0;
export const MAX_AGE = 130;

export function resolveInitialPatientAge(values = {}) {
  const ageFromBirthYear = calculateAgeFromBirthYear(values.birthYear);
  if (ageFromBirthYear != null) {
    return String(ageFromBirthYear);
  }

  if (values.dateOfBirth) {
    const dob = new Date(values.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const ageFromDob = calculateAgeFromBirthYear(dob.getFullYear());
      if (ageFromDob != null) {
        return String(ageFromDob);
      }
    }
  }

  if (values.age !== undefined && values.age !== null && values.age !== '') {
    return String(values.age);
  }

  return '';
}

export function validateAgeInput(ageValue) {
  if (ageValue === '' || ageValue == null) {
    return 'Age is required.';
  }

  const age = Number(ageValue);

  if (!Number.isFinite(age) || !Number.isInteger(age)) {
    return 'Enter a whole number for age.';
  }

  if (age < MIN_AGE || age > MAX_AGE) {
    return `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
  }

  return null;
}

export function resolveBirthYearFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  return dob.getFullYear();
}

export function resolveBirthYearFromPatientData(data = {}) {
  if (data.birthYear != null && data.birthYear !== '') {
    const year = Number(data.birthYear);
    if (Number.isFinite(year) && Number.isInteger(year)) {
      return year;
    }
  }

  return resolveBirthYearFromDateOfBirth(data.dateOfBirth);
}

export function normalizePatientInput({ name, age, birthYear, gender, phone }) {
  const currentYear = new Date().getFullYear();
  let resolvedBirthYear = birthYear;

  if (age !== undefined && age !== null && age !== '') {
    const numericAge = Number(age);
    if (Number.isFinite(numericAge) && Number.isInteger(numericAge)) {
      resolvedBirthYear = currentYear - numericAge;
    }
  }

  const year = Number(resolvedBirthYear);

  return {
    name: String(name ?? '').trim(),
    birthYear: Number.isFinite(year) ? year : resolvedBirthYear,
    gender: String(gender ?? '').trim(),
    phone: String(phone ?? '').trim(),
  };
}

export function validatePatientInput(patient) {
  const errors = {};

  if (!patient.name) {
    errors.name = 'Name is required.';
  }

  const birthYear = Number(patient.birthYear);

  if (
    patient.birthYear === '' ||
    patient.birthYear == null ||
    !Number.isFinite(birthYear) ||
    !Number.isInteger(birthYear)
  ) {
    errors.age = 'Age is required.';
    return errors;
  }

  const age = calculateAgeFromBirthYear(birthYear);

  if (age == null || age < MIN_AGE || age > MAX_AGE) {
    errors.age = `Age must be between ${MIN_AGE} and ${MAX_AGE}.`;
  }

  return errors;
}

export function buildPatientPayload({ name, birthYear, gender, phone, createdAt }) {
  return {
    name,
    birthYear,
    gender,
    phone,
    createdAt,
  };
}
