import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { ROUTES } from '../data/constants';
import {
  getMedicalCertificateCount,
  getMedicalCertificates,
  getPatients,
  getPrescriptions,
} from '../services/apiService';
import { formatDateTime } from '../utils/dateUtils';
import { DOCUMENT_TYPES, resolveDocumentType, summarizeClinicalDocuments } from '../utils/prescriptionFormUtils';

function activityTime(record) {
  const value = record?.createdAt || record?.issuedAt || '';
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function recentByType(records, type) {
  return records
    .filter((record) => resolveDocumentType(record?.type) === type)
    .sort((left, right) => activityTime(right) - activityTime(left))
    .slice(0, 5);
}

function ActivityRows({ items, emptyLabel, description }) {
  if (items.length === 0) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  return (
    <ul className="recent-list">
      {items.map((item) => {
        const detail = description(item);

        return (
          <li key={item.id}>
            <div className="recent-item">
              <div className="recent-item-top">
                <span className="recent-item-name">{item.patientName || '—'}</span>
                <span className="recent-item-date">
                  {formatDateTime(item.issuedAt || item.createdAt)}
                </span>
              </div>
              <span className="recent-item-diagnosis" title={detail}>{detail}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [certificateCount, setCertificateCount] = useState(null);
  const [certificateError, setCertificateError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getPatients(),
      getPrescriptions(),
      getMedicalCertificates(5),
      getMedicalCertificateCount(),
    ]).then(([loadedPatients, loadedPrescriptions, certificateResult, countResult]) => {
      if (cancelled) return;

      setPatients(loadedPatients);
      setPrescriptions(loadedPrescriptions);
      setRecentCertificates(certificateResult?.data ?? []);
      setCertificateCount(countResult?.success ? countResult.data : null);
      setCertificateError(
        certificateResult?.success === false
          ? certificateResult.error || 'Could not load medical certificates.'
          : countResult?.success === false
            ? countResult.error || 'Could not count medical certificates.'
            : ''
      );
      setHasLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const documentCounts = summarizeClinicalDocuments(prescriptions);
  const recentPrescriptions = recentByType(prescriptions, DOCUMENT_TYPES.PRESCRIPTION);
  const recentReferrals = recentByType(prescriptions, DOCUMENT_TYPES.REFERRAL);
  const recentInvestigations = recentByType(prescriptions, DOCUMENT_TYPES.INVESTIGATION);
  const statValue = (value) => (hasLoaded ? value : '…');

  const quickActions = [
    {
      to: ROUTES.NEW_PRESCRIPTION,
      icon: NAV_ICONS.prescription,
      label: 'New Prescription',
      ariaLabel: 'Create a new prescription',
    },
    {
      to: ROUTES.PATIENTS,
      icon: NAV_ICONS.patients,
      label: 'Manage Patients',
      ariaLabel: 'Manage patients',
    },
    {
      to: ROUTES.SETTINGS,
      icon: NAV_ICONS.settings,
      label: 'Settings',
      ariaLabel: 'Open settings',
    },
    {
      to: ROUTES.HISTORY,
      icon: NAV_ICONS.history,
      label: 'History',
      ariaLabel: 'Open history',
    },
    {
      to: ROUTES.CERTIFICATES,
      icon: NAV_ICONS.certificate,
      label: 'Medical Certificates',
      ariaLabel: 'Open medical certificates',
    },
  ];

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>Overview of clinic documents</p>
        </div>
      </header>

      <div className="stats-grid stats-grid--documents">
        <Card className="stat-card">
          <div className="stat-card-label">Patients</div>
          <div className="stat-card-value">{statValue(patients.length)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Prescriptions</div>
          <div className="stat-card-value">{statValue(documentCounts.prescription)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Referrals</div>
          <div className="stat-card-value">{statValue(documentCounts.referral)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Tests / Investigations</div>
          <div className="stat-card-value">{statValue(documentCounts.investigation)}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Medical Certificates</div>
          <div className="stat-card-value">
            {statValue(certificateCount == null ? '—' : certificateCount)}
          </div>
        </Card>
      </div>
      {certificateError && (
        <p className="status-message status-message--error dashboard-inline-error" role="alert">
          {certificateError}
        </p>
      )}

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Quick Access</h2>
        </div>

        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <Card key={action.label} className="glass-card--interactive quick-action-card">
              <Link
                to={action.to}
                className="quick-action-link"
                aria-label={action.ariaLabel}
                title={action.ariaLabel}
              >
                <span className="quick-action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="quick-action-label">{action.label}</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Activities</h2>
        </div>

        <div className="recent-activities-stack">
          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Prescriptions</h3>
              <Link to={ROUTES.HISTORY} className="section-link">
                View all →
              </Link>
            </div>
            <Card>
              <ActivityRows
                items={recentPrescriptions}
                emptyLabel="No prescriptions yet."
                description={(item) => item.diagnosis || 'Prescription'}
              />
            </Card>
          </div>

          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Referrals</h3>
            </div>
            <Card>
              <ActivityRows
                items={recentReferrals}
                emptyLabel="No referrals yet."
                description={(item) => item.referralTitle || 'Referral letter'}
              />
            </Card>
          </div>

          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Investigations</h3>
            </div>
            <Card>
              <ActivityRows
                items={recentInvestigations}
                emptyLabel="No investigations yet."
                description={(item) => item.investigationNotes || 'Investigation request'}
              />
            </Card>
          </div>

          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Medical Certificates</h3>
              <Link to={ROUTES.HISTORY} className="section-link">
                View all →
              </Link>
            </div>
            <Card>
              <ActivityRows
                items={recentCertificates}
                emptyLabel={certificateError ? 'Certificates could not be loaded.' : 'No medical certificates yet.'}
                description={() => 'Medical Certificate'}
              />
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
