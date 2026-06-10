import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { useSettings } from '../context/SettingsContext';
import { ROUTES } from '../data/constants';
import { getPatients, getPrescriptions } from '../services/apiService';
import { formatDateTime } from '../utils/dateUtils';

function Dashboard() {
  const { settings } = useSettings();
  const patients = getPatients();
  const prescriptions = getPrescriptions();
  const recentPrescriptions = prescriptions.slice(0, 5);

  return (
    <section className="dashboard-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Dashboard</h1>
          <p>Welcome back, {settings.doctorName || 'Doctor'}</p>
        </div>
      </header>

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-card-label">Total Patients</div>
          <div className="stat-card-value">{patients.length}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Prescriptions</div>
          <div className="stat-card-value">{prescriptions.length}</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-card-label">Doctor</div>
          <div className="stat-card-value stat-card-value--text">
            {settings.doctorName || 'Not set'}
          </div>
        </Card>
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Prescriptions</h2>
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
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h2>Quick Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <Card className="glass-card--interactive">
            <Link to={ROUTES.NEW_PRESCRIPTION} className="quick-action-link">
              <span className="quick-action-icon">{NAV_ICONS.prescription}</span>
              New prescription
            </Link>
          </Card>
          <Card className="glass-card--interactive">
            <Link to={ROUTES.PATIENTS} className="quick-action-link">
              <span className="quick-action-icon">{NAV_ICONS.patients}</span>
              Manage patients
            </Link>
          </Card>
          <Card className="glass-card--interactive">
            <Link to={ROUTES.SETTINGS} className="quick-action-link">
              <span className="quick-action-icon">{NAV_ICONS.settings}</span>
              Doctor settings
            </Link>
          </Card>
        </div>
      </section>
    </section>
  );
}

export default Dashboard;
