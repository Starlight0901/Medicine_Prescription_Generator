import { useEffect, useState } from 'react';
import CertificateTemplateManager from '../components/CertificateTemplateManager';
import Card from '../components/ui/Card';
import {
  deleteCertificateTemplateById,
  getCertificateTemplates,
  saveCertificateTemplate,
} from '../services/apiService';

function CertificateTemplates() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    getCertificateTemplates().then((result) => {
      if (cancelled) return;

      setTemplates(result.data ?? []);
      setHasLoaded(true);
      setErrorMessage(result.success === false ? result.error || 'Could not load templates.' : '');
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleSave(template) {
    setIsSaving(true);
    const result = await saveCertificateTemplate(template);
    setIsSaving(false);

    if (result.success) {
      setRefreshKey((current) => current + 1);
    }

    return result;
  }

  async function handleDelete(id) {
    setIsSaving(true);
    const result = await deleteCertificateTemplateById(id);
    setIsSaving(false);

    if (result.success) {
      setRefreshKey((current) => current + 1);
    }

    return result;
  }

  return (
    <section className="certificate-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Certificate Templates</h1>
        </div>
      </header>

      {errorMessage && (
        <p className="status-message status-message--error" role="alert">{errorMessage}</p>
      )}

      <Card>
        <div className="certificate-panel">
          <CertificateTemplateManager
            templates={templates}
            onSave={handleSave}
            onDelete={handleDelete}
            isSaving={isSaving}
            isLoading={!hasLoaded}
          />
        </div>
      </Card>
    </section>
  );
}

export default CertificateTemplates;
