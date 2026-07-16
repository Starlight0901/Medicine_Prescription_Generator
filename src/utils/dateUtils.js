export function calculateAgeFromBirthYear(birthYear) {
  if (birthYear == null || birthYear === '') {
    return null;
  }

  const year = Number(birthYear);

  if (!Number.isFinite(year) || !Number.isInteger(year)) {
    return null;
  }

  const age = new Date().getFullYear() - year;
  return age >= 0 ? age : null;
}

/** Resolve display age from birthYear, with legacy dateOfBirth fallback. */
export function resolvePatientAge(patient) {
  const ageFromBirthYear = calculateAgeFromBirthYear(patient?.birthYear);
  if (ageFromBirthYear != null) {
    return ageFromBirthYear;
  }

  if (!patient?.dateOfBirth) {
    return null;
  }

  const dob = new Date(patient.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  return calculateAgeFromBirthYear(dob.getFullYear());
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function deriveDateOfBirthFromAge(age) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge) || numericAge <= 0) return null;

  const today = new Date();
  const birthYear = today.getFullYear() - numericAge;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${birthYear}-${month}-${day}`;
}

export function toDateInputValue(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

export function formatDate(isoString) {
  if (!isoString) return '—';

  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';

  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toISODateString(date = new Date()) {
  return date.toISOString();
}
