import { useMemo, useState } from 'react';
import { toDateInputValue } from '../utils/dateUtils';
import {
  DOCUMENT_TYPES,
  EMPTY_MEDICINE,
} from '../utils/prescriptionFormUtils';
import {
  estimateReferralPages,
  formatReferralPageEstimate,
} from '../utils/referralPageEstimate';

const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPES.PRESCRIPTION, label: 'Prescription' },
  { value: DOCUMENT_TYPES.REFERRAL, label: 'Referral Letter' },
  { value: DOCUMENT_TYPES.INVESTIGATION, label: 'Investigation / Testing' },
];

function PrescriptionForm({
  patients,
  patientId: controlledPatientId,
  onPatientIdChange,
  patientField,
  initialPatientId = '',
  initialDocumentType = DOCUMENT_TYPES.PRESCRIPTION,
  showDocumentTypeSelector = true,
  showDateField = false,
  initialCreatedAt = '',
  initialDiagnosis = '',
  initialMedicines = [{ ...EMPTY_MEDICINE }],
  initialNotes = '',
  initialReferralTitle = '',
  initialReferralContent = '',
  initialInvestigationNotes = '',
  initialInvestigations = [''],
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
  const [documentType, setDocumentType] = useState(initialDocumentType);
  const [prescriptionDate, setPrescriptionDate] = useState(() => {
    if (initialCreatedAt) {
      return toDateInputValue(initialCreatedAt) || getCurrentDateInputValue();
    }

    return getCurrentDateInputValue();
  });
  const [hasEditedPrescriptionDate, setHasEditedPrescriptionDate] = useState(false);
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [notes, setNotes] = useState(initialNotes);
  const [referralTitle, setReferralTitle] = useState(initialReferralTitle);
  const [referralContent, setReferralContent] = useState(initialReferralContent);
  const [investigationNotes, setInvestigationNotes] = useState(initialInvestigationNotes);
  const [investigations, setInvestigations] = useState(
    initialInvestigations.length > 0 ? initialInvestigations : ['']
  );
  const [medicines, setMedicines] = useState(
    initialMedicines.length > 0 ? initialMedicines : [{ ...EMPTY_MEDICINE }]
  );
  const [message, setMessage] = useState('');

  const isPrescription = documentType === DOCUMENT_TYPES.PRESCRIPTION;
  const isReferral = documentType === DOCUMENT_TYPES.REFERRAL;
  const isInvestigation = documentType === DOCUMENT_TYPES.INVESTIGATION;

  function getCurrentDateInputValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function serializePrescriptionDate(value) {
    if (!value) return null;

    const [year, month, day] = value.split('-').map(Number);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }

    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return parsedDate.toISOString();
  }

  const referralPageEstimate = useMemo(() => {
    if (!isReferral) {
      return null;
    }

    return formatReferralPageEstimate(estimateReferralPages(referralContent));
  }, [isReferral, referralContent]);

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

  function updateInvestigation(index, value) {
    setInvestigations((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function addInvestigationRow() {
    setInvestigations((current) => [...current, '']);
  }

  function removeInvestigationRow(index) {
    setInvestigations((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const result = await onSubmit({
      type: documentType,
      patientId,
      diagnosis,
      medicines,
      notes,
      referralTitle,
      referralContent,
      investigationNotes,
      investigations,
      createdAt: showDateField && hasEditedPrescriptionDate
        ? serializePrescriptionDate(prescriptionDate)
        : undefined,
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

      {showDateField && (
        <div className="form-group">
          <label htmlFor="prescriptionDate">Prescription Date</label>
          <input
            id="prescriptionDate"
            type="date"
            value={prescriptionDate}
            onChange={(event) => {
              setPrescriptionDate(event.target.value);
              setHasEditedPrescriptionDate(true);
            }}
          />
        </div>
      )}

      {showDocumentTypeSelector && (
        <fieldset className="form-fieldset document-type-fieldset">
          <legend>Document Type</legend>
          <div className="document-type-options">
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="document-type-option">
                <input
                  type="radio"
                  name="documentType"
                  value={option.value}
                  checked={documentType === option.value}
                  onChange={() => setDocumentType(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {isPrescription && (
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
      )}

      {isReferral && (
        <>
          <div className="form-group">
            <label htmlFor="referralTitle">Referral Title (optional)</label>
            <input
              id="referralTitle"
              type="text"
              value={referralTitle}
              onChange={(event) => setReferralTitle(event.target.value)}
              placeholder="Enter referral title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="referralContent">Referral Letter Content (required)</label>
            <textarea
              id="referralContent"
              className="referral-content-textarea"
              value={referralContent}
              onChange={(event) => setReferralContent(event.target.value)}
              placeholder="Write the referral letter content…"
              rows={14}
            />
            {referralPageEstimate && (
              <p className="referral-page-estimate" aria-live="polite">
                <span>{referralPageEstimate.pageLabel}</span>
                <span className="referral-page-estimate-detail">
                  {referralPageEstimate.linesLabel}
                </span>
              </p>
            )}
          </div>
        </>
      )}

      {isInvestigation && (
        <>
          <div className="form-group">
            <label htmlFor="investigationNotes">Clinical Notes (optional)</label>
            <textarea
              id="investigationNotes"
              value={investigationNotes}
              onChange={(event) => setInvestigationNotes(event.target.value)}
              placeholder="Clinical notes for this investigation request"
              rows={4}
            />
          </div>

          <fieldset className="form-fieldset">
            <legend>Investigations and Tests</legend>
            {investigations.map((investigation, index) => (
              <div key={index} className="investigation-row">
                <input
                  type="text"
                  placeholder="Investigation or test"
                  value={investigation}
                  onChange={(event) => updateInvestigation(index, event.target.value)}
                />
                {investigations.length > 1 && (
                  <div className="investigation-row-actions">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeInvestigationRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addInvestigationRow}
            >
              + Add Investigation
            </button>
          </fieldset>
        </>
      )}

      {(isPrescription || isInvestigation) && (
        <fieldset className="form-fieldset">
          <legend>Medicines{isInvestigation ? ' (optional)' : ''}</legend>
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
      )}

      {isPrescription && (
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
      )}

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
