import Card from './ui/Card';
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

  return (
    <Card className="prescription-detail glass-card--strong" aria-labelledby="prescription-detail-title">
      <header className="prescription-detail-header">
        <div>
          <h2 id="prescription-detail-title">{prescription.patientName}</h2>
          <p>{formatDateTime(prescription.createdAt)}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <dl className="prescription-detail-body">
        <div>
          <dt>Diagnosis</dt>
          <dd>{prescription.diagnosis}</dd>
        </div>

        <div>
          <dt>Medicines</dt>
          <dd>
            <ul>
              {(prescription.medicines ?? []).map((medicine, index) => (
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

        {prescription.notes && (
          <div>
            <dt>Notes</dt>
            <dd>{prescription.notes}</dd>
          </div>
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
