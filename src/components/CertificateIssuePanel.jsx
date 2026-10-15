import { useMemo, useState } from 'react';
import CertificateEntryForm from './CertificateEntryForm';
import { TEMPLATE_CATEGORIES } from '../utils/certificateTemplateUtils';

function CertificateIssuePanel({
  templates,
  patients,
  selectedPatient,
  onSelectPatient,
  onClose,
  onIssue,
  onFinished,
  isLoading = false,
}) {
  const [category, setCategory] = useState('medical-leave');
  const [templateId, setTemplateId] = useState('');
  const [step, setStep] = useState('select');

  const visibleTemplates = useMemo(
    () => templates.filter((template) => template.category === category),
    [templates, category]
  );
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;

  if (step === 'form' && selectedTemplate) {
    return (
      <CertificateEntryForm
        template={selectedTemplate}
        patients={patients}
        selectedPatient={selectedPatient}
        onSelectPatient={onSelectPatient}
        onIssue={onIssue}
        onFinished={onFinished}
        onBack={() => setStep('select')}
      />
    );
  }

  return (
    <div>
      <h2>New medical certificate</h2>
      <p className="certificate-help-text">
        Choose a template. The form uses that template&apos;s headings, text, labels, and fields.
      </p>

      <div className="form-group">
        <label htmlFor="issue-category">Category</label>
        <select
          id="issue-category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setTemplateId('');
          }}
        >
          {TEMPLATE_CATEGORIES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading templates…</div>
      ) : visibleTemplates.length === 0 ? (
        <div className="empty-state">No templates in this category yet.</div>
      ) : (
        <fieldset className="form-fieldset">
          <legend>Template</legend>
          <div className="certificate-template-options">
            {visibleTemplates.map((template) => (
              <label key={template.id} className="certificate-template-option">
                <input
                  type="radio"
                  name="certificate-template"
                  value={template.id}
                  checked={templateId === template.id}
                  onChange={() => setTemplateId(template.id)}
                />
                <span>
                  <strong>{template.name}</strong>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setStep('form')}
          disabled={!selectedTemplate}
        >
          Continue
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default CertificateIssuePanel;
