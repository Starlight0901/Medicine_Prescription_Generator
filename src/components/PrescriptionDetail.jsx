import Card from './ui/Card';
import { DOCUMENT_TYPES, getDocumentTypeLabel } from '../utils/prescriptionFormUtils';
import { formatDateTime } from '../utils/dateUtils';

function PrescriptionDetail({
  prescription,
  onClose,
  onGeneratePdf,
  onEdit,
  onDelete,
  isGeneratingPdf = false,
}) {
  if (!prescription) return null;

  const isReferral = prescription.type === DOCUMENT_TYPES.REFERRAL;
  const isInvestigation = prescription.type === DOCUMENT_TYPES.INVESTIGATION;
  const isPrescription =
    !prescription.type || prescription.type === DOCUMENT_TYPES.PRESCRIPTION;
  const medicines = (prescription.medicines ?? []).filter((medicine) => medicine.name?.trim());
  const investigations = (prescription.investigations ?? [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  return (
    <Card className="prescription-detail glass-card--strong" aria-labelledby="prescription-detail-title">
      <header className="prescription-detail-header">
        <div>
          <h2 id="prescription-detail-title">{prescription.patientName}</h2>
          <p>
            {getDocumentTypeLabel(prescription.type)} · {formatDateTime(prescription.createdAt)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <dl className="prescription-detail-body">
        {isReferral && (
          <>
            {prescription.referralTitle && (
              <div>
                <dt>Referral Title</dt>
                <dd>{prescription.referralTitle}</dd>
              </div>
            )}

            <div>
              <dt>Referral Letter Content</dt>
              <dd className="document-detail-pre-wrap">{prescription.referralContent}</dd>
            </div>
          </>
        )}

        {isInvestigation && (
          <>
            {prescription.investigationNotes && (
              <div>
                <dt>Clinical Notes</dt>
                <dd className="document-detail-pre-wrap">{prescription.investigationNotes}</dd>
              </div>
            )}

            <div>
              <dt>Investigations and Tests</dt>
              <dd>
                <ul>
                  {investigations.map((investigation, index) => (
                    <li key={index}>{investigation}</li>
                  ))}
                </ul>
              </dd>
            </div>

            {medicines.length > 0 && (
              <div>
                <dt>Medicines</dt>
                <dd>
                  <ul>
                    {medicines.map((medicine, index) => (
                      <li key={index}>
                        <strong>{medicine.name}</strong>
                        {medicine.dosage && ` — ${medicine.dosage}`}
                        {medicine.frequency && `, ${medicine.frequency}`}
                        {medicine.duration && `, ${medicine.duration}`}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </>
        )}

        {isPrescription && (
          <>
            {prescription.diagnosis && (
              <div>
                <dt>Diagnosis</dt>
                <dd>{prescription.diagnosis}</dd>
              </div>
            )}

            {medicines.length > 0 && (
              <div>
                <dt>Medicines</dt>
                <dd>
                  <ul>
                    {medicines.map((medicine, index) => (
                      <li key={index}>
                        <strong>{medicine.name}</strong>
                        {medicine.dosage && ` — ${medicine.dosage}`}
                        {medicine.frequency && `, ${medicine.frequency}`}
                        {medicine.duration && `, ${medicine.duration}`}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {prescription.notes && (
              <div>
                <dt>Notes</dt>
                <dd>{prescription.notes}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      <div className="prescription-detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onGeneratePdf(prescription)}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? 'Generating PDF…' : 'Generate PDF'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onEdit(prescription)}>
          Edit
        </button>
        <button type="button" className="btn btn-danger" onClick={() => onDelete(prescription)}>
          Delete
        </button>
      </div>
    </Card>
  );
}

export default PrescriptionDetail;
