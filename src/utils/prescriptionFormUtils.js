export const EMPTY_MEDICINE = { name: '', dosage: '', frequency: '', duration: '' };

export const DOCUMENT_TYPES = {
  PRESCRIPTION: 'prescription',
  REFERRAL: 'referral',
  INVESTIGATION: 'investigation',
};

export function getDocumentTypeLabel(type) {
  switch (resolveDocumentType(type)) {
    case DOCUMENT_TYPES.REFERRAL:
      return 'Referral Letter';
    case DOCUMENT_TYPES.INVESTIGATION:
      return 'Investigation / Testing';
    default:
      return 'Prescription';
  }
}

export function resolveDocumentType(type) {
  const normalized = String(type ?? DOCUMENT_TYPES.PRESCRIPTION).toLowerCase();

  if (normalized === DOCUMENT_TYPES.REFERRAL) {
    return DOCUMENT_TYPES.REFERRAL;
  }

  if (normalized === DOCUMENT_TYPES.INVESTIGATION) {
    return DOCUMENT_TYPES.INVESTIGATION;
  }

  return DOCUMENT_TYPES.PRESCRIPTION;
}

export function getDocumentTypeBadge(type) {
  switch (resolveDocumentType(type)) {
    case DOCUMENT_TYPES.REFERRAL:
      return 'REFERRAL';
    case DOCUMENT_TYPES.INVESTIGATION:
      return 'INVESTIGATION';
    default:
      return 'PRESCRIPTION';
  }
}

export function buildPrescriptionPayload({
  type = DOCUMENT_TYPES.PRESCRIPTION,
  patientId,
  patients,
  diagnosis,
  medicines,
  notes,
  referralTitle,
  referralContent,
  investigationNotes,
  investigations,
  existingPrescription = null,
}) {
  const selectedPatient = patients.find((patient) => patient.id === patientId);

  if (!selectedPatient) {
    return { success: false, message: 'Please select a patient.' };
  }

  const documentType = type || existingPrescription?.type || DOCUMENT_TYPES.PRESCRIPTION;
  const baseData = {
    type: documentType,
    patientId: selectedPatient.id,
    patientName: selectedPatient.name,
    createdAt: existingPrescription?.createdAt,
  };

  if (documentType === DOCUMENT_TYPES.REFERRAL) {
    if (!String(referralContent ?? '').trim()) {
      return {
        success: false,
        message: 'Referral letter content is required.',
      };
    }

    return {
      success: true,
      data: {
        ...baseData,
        referralTitle: String(referralTitle ?? '').trim(),
        referralContent: String(referralContent ?? '').trim(),
      },
    };
  }

  if (documentType === DOCUMENT_TYPES.INVESTIGATION) {
    const filteredInvestigations = (investigations ?? [])
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);

    if (filteredInvestigations.length === 0) {
      return {
        success: false,
        message: 'At least one investigation is required.',
      };
    }

    const filteredMedicines = (medicines ?? []).filter((medicine) => medicine.name.trim());

    const investigationData = {
      ...baseData,
      investigationNotes: String(investigationNotes ?? '').trim(),
      investigations: filteredInvestigations,
    };

    if (filteredMedicines.length > 0) {
      investigationData.medicines = filteredMedicines;
    }

    return {
      success: true,
      data: investigationData,
    };
  }

  const filteredMedicines = (medicines ?? []).filter((medicine) => medicine.name.trim());

  if (filteredMedicines.length === 0) {
    return {
      success: false,
      message: 'At least one medicine is required.',
    };
  }

  return {
    success: true,
    data: {
      ...baseData,
      diagnosis: String(diagnosis ?? '').trim(),
      medicines: filteredMedicines,
      notes: String(notes ?? '').trim(),
    },
  };
}
