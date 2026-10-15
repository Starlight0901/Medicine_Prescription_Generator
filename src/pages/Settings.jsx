import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { useSettings } from '../context/SettingsContext';
import { normalizeSettings } from '../services/settingsService';

const EMPTY_FORM = normalizeSettings();

function Settings() {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState({ ...EMPTY_FORM, ...settings });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    setFormData({ ...EMPTY_FORM, ...settings });
  }, [settings]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const result = await updateSettings(formData);

    if (!result.success) {
      setErrors(result.errors ?? {});
      setMessage('');
      return;
    }

    setErrors({});
    setMessage('Settings saved successfully.');
  }

  return (
    <section className="settings-page">
      <header className="page-header">
        <div className="page-title-group">
          <h1>Settings</h1>
          <p>Configure your doctor identity, clinic contact details, and prescription assets.</p>
        </div>
      </header>

      <Card className="glass-card--strong">
        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="doctorName">Doctor name</label>
            <input
              id="doctorName"
              name="doctorName"
              type="text"
              value={formData.doctorName}
              onChange={handleChange}
              placeholder="Dr. Jane Smith"
            />
            {errors.doctorName && <p className="form-error">{errors.doctorName}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="clinicAddress">Clinic address (optional)</label>
            <textarea
              id="clinicAddress"
              name="clinicAddress"
              rows={3}
              value={formData.clinicAddress ?? ''}
              onChange={handleChange}
              placeholder="Street, city"
            />
          </div>

          <div className="form-group">
            <label htmlFor="clinicEmail">Clinic email (optional)</label>
            <input
              id="clinicEmail"
              name="clinicEmail"
              type="email"
              value={formData.clinicEmail ?? ''}
              onChange={handleChange}
              placeholder="clinic@example.com"
            />
            {errors.clinicEmail && <p className="form-error">{errors.clinicEmail}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="signatureImageUrl">Signature image URL</label>
            <input
              id="signatureImageUrl"
              name="signatureImageUrl"
              type="url"
              value={formData.signatureImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/signature.png"
            />
            {formData.signatureImageUrl && (
              <img
                className="settings-image-preview"
                src={formData.signatureImageUrl}
                alt="Signature preview"
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="sealImageUrl">Seal image URL</label>
            <input
              id="sealImageUrl"
              name="sealImageUrl"
              type="url"
              value={formData.sealImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/seal.png"
            />
            {formData.sealImageUrl && (
              <img
                className="settings-image-preview"
                src={formData.sealImageUrl}
                alt="Seal preview"
              />
            )}
          </div>

          {errors.form && <p className="form-error">{errors.form}</p>}
          {message && <p className="status-message" role="status">{message}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save settings
            </button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default Settings;
