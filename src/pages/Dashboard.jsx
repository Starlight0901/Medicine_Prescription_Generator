import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { ROUTES } from '../data/constants';
import { getPatients, getPrescriptions } from '../services/apiService';
import { formatDateTime } from '../utils/dateUtils';

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPatients(), getPrescriptions()]).then(([loadedPatients, loadedPrescriptions]) => {
      if (!cancelled) {
        setPatients(loadedPatients);
        setPrescriptions(loadedPrescriptions);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentItems = [...prescriptions].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0);
    const rightTime = Date.parse(right.createdAt || 0);
    return rightTime - leftTime;
  });

  const recentPrescriptions = recentItems
    .filter((item) => item?.type === 'prescription')
    .slice(0, 5);
  const recentReferrals = recentItems
    .filter((item) => item?.type === 'referral')
    .slice(0, 5);
  const recentInvestigations = recentItems
    .filter((item) => item?.type === 'investigation')
    .slice(0, 5);

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
  ];

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>Overview of your prescription activity</p>
        </div>
      </header>

      <div className="stats-grid stats-grid--two">
        <Card className="stat-card">
          <div className="stat-card-label">Total Patients</div>
          <div className="stat-card-value">{patients.length}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Prescriptions</div>
          <div className="stat-card-value">{prescriptions.length}</div>
        </Card>
      </div>

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
              {recentPrescriptions.length === 0 ? (
                <div className="empty-state">No prescriptions yet.</div>
              ) : (
                <ul className="recent-list">
                  {recentPrescriptions.map((prescription) => (
                    <li key={prescription.id}>
                      <div className="recent-item">
                        <div className="recent-item-top">
                          <span className="recent-item-name">{prescription.patientName}</span>
                          <span className="recent-item-date">
                            {formatDateTime(prescription.createdAt)}
                          </span>
                        </div>
                        <span className="recent-item-diagnosis">{prescription.diagnosis}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Referrals</h3>
            </div>

            <Card>
              {recentReferrals.length === 0 ? (
                <div className="empty-state">No referrals yet.</div>
              ) : (
                <ul className="recent-list">
                  {recentReferrals.map((referral) => (
                    <li key={referral.id}>
                      <div className="recent-item">
                        <div className="recent-item-top">
                          <span className="recent-item-name">{referral.patientName}</span>
                          <span className="recent-item-date">
                            {formatDateTime(referral.createdAt)}
                          </span>
                        </div>
                        <span className="recent-item-diagnosis">
                          {referral.referralTitle || 'Referral letter'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="activity-group">
            <div className="activity-group-header">
              <h3>Recent Investigations</h3>
            </div>

            <Card>
              {recentInvestigations.length === 0 ? (
                <div className="empty-state">No investigations yet.</div>
              ) : (
                <ul className="recent-list">
                  {recentInvestigations.map((investigation) => (
                    <li key={investigation.id}>
                      <div className="recent-item">
                        <div className="recent-item-top">
                          <span className="recent-item-name">{investigation.patientName}</span>
                          <span className="recent-item-date">
                            {formatDateTime(investigation.createdAt)}
                          </span>
                        </div>
                        <span className="recent-item-diagnosis">
                          {investigation.investigationNotes || 'Investigation request'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
