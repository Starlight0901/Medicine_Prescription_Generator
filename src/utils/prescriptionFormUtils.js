export const EMPTY_MEDICINE = { name: '', dosage: '', frequency: '', duration: '' };

export function buildPrescriptionPayload({
  patientId,
  patients,
  diagnosis,
  medicines,
  notes,
  existingPrescription = null,
}) {
  const selectedPatient = patients.find((patient) => patient.id === patientId);

  if (!selectedPatient) {
    return { success: false, message: 'Please select a patient.' };
  }

  const filteredMedicines = medicines.filter((medicine) => medicine.name.trim());

  if (filteredMedicines.length === 0) {
    return {
      success: false,
      message: 'At least one medicine is required.',
    };
  }

  return {
    success: true,
    data: {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      diagnosis: diagnosis.trim(),
      medicines: filteredMedicines,
      notes: notes.trim(),
      createdAt: existingPrescription?.createdAt,
    },
  };
}
