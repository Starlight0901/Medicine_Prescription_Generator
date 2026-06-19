import { useState } from 'react';
import { EMPTY_MEDICINE } from '../utils/prescriptionFormUtils';

function PrescriptionForm({
  patients,
  patientId: controlledPatientId,
  onPatientIdChange,
  patientField,
  initialPatientId = '',
  initialDiagnosis = '',
  initialMedicines = [{ ...EMPTY_MEDICINE }],
  initialNotes = '',
  onSubmit,
  onCancel,
  submitLabel = 'Save prescription',
  isSubmitting = false,
}) {
  const [uncontrolledPatientId, setUncontrolledPatientId] = useState(
    initialPatientId || patients[0]?.id || ''
  );
  const isPatientControlled = controlledPatientId !== undefined;
  const patientId = isPatientControlled ? controlledPatientId : uncontrolledPatientId;
  const setPatientId = onPatientIdChange ?? setUncontrolledPatientId;
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [notes, setNotes] = useState(initialNotes);
  const [medicines, setMedicines] = useState(
    initialMedicines.length > 0 ? initialMedicines : [{ ...EMPTY_MEDICINE }]
  );
  const [message, setMessage] = useState('');

  function updateMedicine(index, field, value) {
    setMedicines((current) =>
      current.map((medicine, medicineIndex) =>
        medicineIndex === index ? { ...medicine, [field]: value } : medicine
      )
    );
  }

  function addMedicineRow() {
    setMedicines((current) => [...current, { ...EMPTY_MEDICINE }]);
  }

  function removeMedicineRow(index) {
    setMedicines((current) => current.filter((_, medicineIndex) => medicineIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const result = await onSubmit({
      patientId,
      diagnosis,
      medicines,
      notes,
    });

    if (result?.message) {
      setMessage(result.message);
    }
  }

  if (!patientField && patients.length === 0) {
    return <div className="empty-state">Add patients before creating prescriptions.</div>;
  }

  return (
    <form className="prescription-form" onSubmit={handleSubmit}>
      {patientField ?? (
        <div className="form-group">
          <label htmlFor="patient">Patient</label>
          <select
            id="patient"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="diagnosis">Diagnosis (optional)</label>
        <input
          id="diagnosis"
          type="text"
          value={diagnosis}
          onChange={(event) => setDiagnosis(event.target.value)}
          placeholder="Enter diagnosis"
        />
      </div>

      <fieldset className="form-fieldset">
        <legend>Medicines</legend>
        {medicines.map((medicine, index) => (
          <div key={index} className="medicine-row">
            <input
              type="text"
              placeholder="Medicine name"
              value={medicine.name}
              onChange={(event) => updateMedicine(index, 'name', event.target.value)}
            />
            <input
              type="text"
              placeholder="Dosage"
              value={medicine.dosage}
              onChange={(event) => updateMedicine(index, 'dosage', event.target.value)}
            />
            <input
              type="text"
              placeholder="Frequency"
              value={medicine.frequency}
              onChange={(event) => updateMedicine(index, 'frequency', event.target.value)}
            />
            <input
              type="text"
              placeholder="Duration"
              value={medicine.duration}
              onChange={(event) => updateMedicine(index, 'duration', event.target.value)}
            />
            {medicines.length > 1 && (
              <div className="medicine-row-actions">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeMedicineRow(index)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-secondary btn-sm" onClick={addMedicineRow}>
          Add medicine
        </button>
      </fieldset>

      <div className="form-group">
        <label htmlFor="notes">Prescription notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Additional instructions"
          rows={4}
        />
      </div>

      {message && <p className="form-error" role="alert">{message}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Generating PDF…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default PrescriptionForm;
