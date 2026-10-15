import { useState } from 'react';

function canSharePdfFile(file) {
  if (!file || typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function CertificateShareDialog({ file, onDone }) {
  const [statusMessage, setStatusMessage] = useState('');
  const nativeShare = canSharePdfFile(file);

  async function shareFile() {
    setStatusMessage('');

    try {
      await navigator.share({
        files: [file],
      });
      setStatusMessage('The PDF was shared.');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setStatusMessage('Sharing was cancelled.');
        return;
      }

      setStatusMessage('The PDF could not be shared from this browser. Attach the downloaded file manually.');
    }
  }

  return (
    <div className="history-modal-overlay certificate-share-overlay">
      <div
        className="history-modal-dialog certificate-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-share-title"
      >
        <h2 id="certificate-share-title">Certificate downloaded</h2>
        <p>The PDF was downloaded to this device. It was not uploaded.</p>
        {!nativeShare && (
          <p>This browser cannot attach the PDF to another app. Attach the downloaded file manually.</p>
        )}
        {statusMessage && <p className="status-message" role="status">{statusMessage}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={shareFile} disabled={!nativeShare}>
            Share PDF
          </button>
          <button type="button" className="btn btn-secondary" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default CertificateShareDialog;
