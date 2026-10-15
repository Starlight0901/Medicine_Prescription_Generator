import Card from './ui/Card';
import { formatDate } from '../utils/dateUtils';

function formatHistoryDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—';
  return formatDate(value);
}

function formatLeaveDays(duration) {
  if (duration == null || !Number.isFinite(Number(duration))) return '—';

  const days = Number(duration);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function CertificateHistoryDetail({
  record,
  onClose,
  onGeneratePdf,
  onDelete,
  isGeneratingPdf = false,
}) {
  if (!record) return null;

  const canDownload = Boolean(record.certificate?.canRegenerate);

  return (
    <Card className="prescription-detail glass-card--strong" aria-labelledby="certificate-history-title">
      <header className="prescription-detail-header">
        <div>
          <h2 id="certificate-history-title">{record.patientName || '—'}</h2>
          <p>
            {record.templateName || 'Medical Certificate'}
            {' · '}
            {formatHistoryDate(record.createdAt)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <dl className="prescription-detail-body">
        <div>
          <dt>Illness or statement</dt>
          <dd className="document-detail-pre-wrap">{record.medicalStatement || '—'}</dd>
        </div>
        <div>
          <dt>Leave days</dt>
          <dd>{formatLeaveDays(record.duration)}</dd>
        </div>
      </dl>

      {!canDownload && (
        <p className="form-error">This saved certificate does not include the details needed to recreate the PDF.</p>
      )}

      <div className="prescription-detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onGeneratePdf(record)}
          disabled={isGeneratingPdf || !canDownload}
        >
          {isGeneratingPdf ? 'Generating PDF…' : 'Generate PDF'}
        </button>
        {onDelete && (
          <button type="button" className="btn btn-danger" onClick={() => onDelete(record)}>
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}

export default CertificateHistoryDetail;
