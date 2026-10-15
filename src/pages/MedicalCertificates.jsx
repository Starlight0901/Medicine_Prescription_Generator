import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CertificateIssuePanel from '../components/CertificateIssuePanel';
import PatientSelectionModal from '../components/PatientSelectionModal';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { ROUTES } from '../data/constants';
import {
  getCertificateTemplates,
  getMedicalCertificates,
  getPatients,
  issueCertificate,
} from '../services/apiService';
import { downloadIssuedCertificatePDF } from '../services/pdf';
import { formatDate } from '../utils/dateUtils';

const RECENT_CERTIFICATE_LIMIT = 5;

const BUILT_IN_CATEGORY_LABELS = {
  'Medical Leave Certificate': 'Medical Leave',
  'Medical Fitness Certificate': 'Fitness Certificate',
};

function certificateTemplateName(certificate) {
  return certificate.templateSnapshot?.name || 'Medical Certificate';
}

function certificateCategoryLabel(certificate) {
  const name = String(certificate.templateSnapshot?.name ?? '').trim();
  if (BUILT_IN_CATEGORY_LABELS[name]) return BUILT_IN_CATEGORY_LABELS[name];
  if (name) return name;

  const category = certificate.certificateType || certificate.templateSnapshot?.category;
  if (category === 'medical-leave') return 'Medical Leave';
  if (category === 'medical-fitness') return 'Fitness Certificate';
  return 'Certificate';
}

function recentCertificateDayLabel(certificate) {
  const duration = certificate.details?.duration;
  if (duration == null || duration === '' || !Number.isFinite(Number(duration))) return null;

  const days = Number(duration);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function certificateIssueDate(certificate) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(certificate.issueDate || '')) {
    return formatDate(`${certificate.issueDate}T12:00:00`);
  }

  return formatDate(certificate.issuedAt);
}

function certificateLeaveDays(certificate) {
  const duration = certificate.details?.duration;
  if (duration == null || !Number.isFinite(Number(duration))) return '—';

  const days = Number(duration);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function MedicalCertificates() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [patients, setPatients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientModalView, setPatientModalView] = useState('list');
  const [isCertificateEntryOpen, setIsCertificateEntryOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasLoadedCertificates, setHasLoadedCertificates] = useState(false);
  const [hasLoadedTemplates, setHasLoadedTemplates] = useState(false);
  const [openedCertificateId, setOpenedCertificateId] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  useEffect(() => {
    let cancelled = false;

    getPatients().then((loadedPatients) => {
      if (!cancelled) {
        setPatients(loadedPatients);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    getMedicalCertificates(RECENT_CERTIFICATE_LIMIT).then((result) => {
      if (cancelled) return;

      setCertificates(result.data ?? []);
      setHasLoadedCertificates(true);
      setErrorMessage(result.success === false ? result.error || 'Could not load certificates.' : '');
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!isCertificateEntryOpen || hasLoadedTemplates) return undefined;

    let cancelled = false;

    getCertificateTemplates().then((result) => {
      if (cancelled) return;

      setTemplates(result.data ?? []);
      setHasLoadedTemplates(true);

      if (result.success === false) {
        setErrorMessage(result.error || 'Could not load certificate templates.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isCertificateEntryOpen, hasLoadedTemplates]);

  function openPatientModal(view) {
    setPatientModalView(view);
    setIsPatientModalOpen(true);
  }

  function handlePatientSelected(patient) {
    setPatients((current) =>
      current.some((entry) => entry.id === patient.id) ? current : [patient, ...current]
    );
    setSelectedPatient(patient);
    setIsPatientModalOpen(false);
    setStatusMessage(`${patient.name} is selected for the next certificate.`);
  }

  async function handleIssueCertificate(certificate) {
    const result = await issueCertificate(certificate);

    if (result.success) {
      setRefreshKey((current) => current + 1);
      setStatusMessage(result.duplicate ? 'This certificate was already saved.' : 'Certificate saved.');
    }

    return result;
  }

  async function handleDownloadCertificate(certificate) {
    if (downloadingId) return;

    setDownloadingId(certificate.id);
    setDownloadError('');

    try {
      await downloadIssuedCertificatePDF(certificate);
    } catch (error) {
      setDownloadError(error?.message || 'Could not recreate the certificate PDF.');
    } finally {
      setDownloadingId('');
    }
  }

  function handleSelectPatient(patientId) {
    const patient = patients.find((entry) => entry.id === patientId) ?? null;
    setSelectedPatient(patient);
    setStatusMessage(patient ? `${patient.name} is selected for the next certificate.` : '');
  }

  const openedCertificate = certificates.find((certificate) => certificate.id === openedCertificateId) ?? null;

  return (
    <section className="certificate-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Medical Certificates</h1>
        </div>
        <div className="certificate-header-actions">
          <button
            type="button"
            className="btn btn-secondary certificate-action-btn"
            onClick={() => openPatientModal('add')}
          >
            <span className="certificate-action-icon" aria-hidden="true">{NAV_ICONS.patients}</span>
            <span className="certificate-action-label">Add New Patient</span>
          </button>
          <button
            type="button"
            className="btn btn-primary certificate-action-btn"
            onClick={() => {
              setIsCertificateEntryOpen(true);
              setStatusMessage('');
            }}
          >
            <span className="certificate-action-icon" aria-hidden="true">{NAV_ICONS.certificate}</span>
            <span className="certificate-action-label">Add New Medical Certificate</span>
          </button>
          <Link to={ROUTES.CERTIFICATE_TEMPLATES} className="btn btn-secondary certificate-action-btn">
            <span className="certificate-action-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="12" height="16" rx="1" />
                <path d="M8 3.5h8a2 2 0 0 1 2 2V19" />
                <path d="M8 8h6M8 12h6M8 16h4" />
              </svg>
            </span>
            <span className="certificate-action-label">Certificate Templates</span>
          </Link>
        </div>
      </header>

      {statusMessage && (
        <p className="status-message" role="status">{statusMessage}</p>
      )}
      {errorMessage && (
        <p className="status-message status-message--error" role="alert">{errorMessage}</p>
      )}

      {isCertificateEntryOpen && (
        <Card className="glass-card--strong">
          <div className="certificate-panel">
            <CertificateIssuePanel
              templates={templates}
              patients={patients}
              selectedPatient={selectedPatient}
              onSelectPatient={handleSelectPatient}
              onIssue={handleIssueCertificate}
              onFinished={() => {
                setIsCertificateEntryOpen(false);
                setRefreshKey((current) => current + 1);
                setStatusMessage('Certificate saved.');
              }}
              onClose={() => setIsCertificateEntryOpen(false)}
              isLoading={!hasLoadedTemplates}
            />
          </div>
        </Card>
      )}

      <section aria-labelledby="recent-certificates-heading">
        <h2 id="recent-certificates-heading" className="certificate-history-heading">Recent certificates</h2>
        {downloadError && !openedCertificate && <p className="form-error">{downloadError}</p>}
        {!hasLoadedCertificates ? (
          <Card>
            <div className="empty-state">Loading certificates…</div>
          </Card>
        ) : certificates.length === 0 ? (
          <Card>
            <div className="empty-state">No medical certificates yet.</div>
          </Card>
        ) : (
          <ul className="certificate-recent-list">
            {certificates.map((certificate) => {
              const isOpen = openedCertificateId === certificate.id;
              const dayLabel = recentCertificateDayLabel(certificate);

              return (
                <li key={certificate.id}>
                  <button
                    type="button"
                    className={`certificate-recent-item${isOpen ? ' selected' : ''}`}
                    onClick={() => {
                      setOpenedCertificateId(certificate.id);
                      setDownloadError('');
                    }}
                    aria-expanded={isOpen}
                  >
                    <span className="certificate-recent-identity">
                      <strong>{certificate.patientName || '—'}</strong>
                      <span className="certificate-recent-date">{certificateIssueDate(certificate)}</span>
                    </span>
                    <span className="certificate-recent-aside">
                      <span className="certificate-category-badge">{certificateCategoryLabel(certificate)}</span>
                      {dayLabel && <span className="certificate-recent-days">{dayLabel}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {openedCertificate && (
        <div
          className="history-modal-overlay certificate-detail-overlay"
          onClick={() => setOpenedCertificateId('')}
        >
          <div
            className="history-modal-dialog certificate-detail-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-detail-title"
          >
            <Card className="prescription-detail glass-card--strong">
              <header className="prescription-detail-header">
                <div>
                  <h2 id="certificate-detail-title">{openedCertificate.patientName || '—'}</h2>
                  <p>{certificateTemplateName(openedCertificate)}</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setOpenedCertificateId('')}>
                  Close
                </button>
              </header>

              <dl className="prescription-detail-body">
                <div>
                  <dt>Illness or statement</dt>
                  <dd className="document-detail-pre-wrap">
                    {openedCertificate.details?.medicalStatement || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Issue date</dt>
                  <dd>{certificateIssueDate(openedCertificate)}</dd>
                </div>
                <div>
                  <dt>Leave days</dt>
                  <dd>{certificateLeaveDays(openedCertificate)}</dd>
                </div>
              </dl>

              {downloadError && <p className="form-error">{downloadError}</p>}

              <div className="prescription-detail-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownloadCertificate(openedCertificate)}
                  disabled={!openedCertificate.canRegenerate || downloadingId === openedCertificate.id}
                >
                  {downloadingId === openedCertificate.id ? 'Generating PDF…' : 'Generate PDF'}
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {isPatientModalOpen && (
        <PatientSelectionModal
          patients={patients}
          contentClassName="certificate-patient-modal"
          initialView={patientModalView}
          onSelect={handlePatientSelected}
          onClose={() => setIsPatientModalOpen(false)}
          onPatientsChange={() => setRefreshKey((current) => current + 1)}
        />
      )}
    </section>
  );
}

export default MedicalCertificates;
