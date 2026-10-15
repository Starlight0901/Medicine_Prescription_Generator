import { useEffect, useState } from 'react';
import { generateMedicalCertificatePDF } from '../services/pdf';

function CertificatePdfPreviewModal({
  title,
  note,
  template,
  values,
  settings,
  onClose,
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let cancelled = false;

    generateMedicalCertificatePDF({
      template,
      values,
      settings,
      createdAt: values?.certificateDate
        ? new Date(`${values.certificateDate}T00:00:00.000Z`).toISOString()
        : new Date().toISOString(),
    }).then((bytes) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setUrl(objectUrl);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError?.message || 'Could not prepare the preview.');
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings, template, values]);

  return (
    <div className="history-modal-overlay certificate-preview-overlay" onClick={onClose}>
      <div
        className="history-modal-dialog certificate-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="history-modal-header certificate-preview-header">
          <div className="certificate-preview-heading">
            <h2 id="certificate-preview-title">{title}</h2>
            {note && <p>{note}</p>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        {!url && !error && <p className="certificate-help-text">Preparing preview…</p>}
        {url && (
          <div className="certificate-pdf-viewport">
            <iframe className="certificate-pdf-frame" title={title} src={url} />
          </div>
        )}
      </div>
    </div>
  );
}

export default CertificatePdfPreviewModal;
