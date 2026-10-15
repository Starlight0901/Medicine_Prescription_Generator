import { useState } from 'react';
import CertificateTemplateEditor from './CertificateTemplateEditor';
import { describeBlock, getCategoryLabel } from '../utils/certificateTemplateUtils';

function CertificateTemplateManager({
  templates,
  onSave,
  onDelete,
  isSaving = false,
  isLoading = false,
}) {
  const [mode, setMode] = useState('list');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [message, setMessage] = useState('');

  async function handleSave(values) {
    const result = await onSave(values);

    if (result.success) {
      setMode('list');
      setEditingTemplate(null);
      setMessage(
        values.id
          ? 'Template saved. Certificates already issued keep their saved copy.'
          : 'Template saved. You can select it when creating a certificate.'
      );
    }

    return result;
  }

  async function handleDelete(template) {
    const confirmed = window.confirm(
      `Delete "${template.name}"? Certificates already issued keep their saved copy of this template.`
    );
    if (!confirmed) return;

    const result = await onDelete(template.id);
    if (!result.success) {
      setMessage(result.error || 'Failed to delete the template.');
      return;
    }

    if (editingTemplate?.id === template.id) {
      setMode('list');
      setEditingTemplate(null);
    }

    setMessage('Template deleted. Issued certificates still keep their saved copy.');
  }

  if (mode === 'edit') {
    return (
      <div>
        <h2>{editingTemplate ? 'Edit template' : 'New template'}</h2>
        <CertificateTemplateEditor
          key={editingTemplate?.id ?? 'new-template'}
          initialTemplate={editingTemplate}
          templates={templates}
          onSave={handleSave}
          onCancel={() => {
            setMode('list');
            setEditingTemplate(null);
          }}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="certificate-section-header">
        <h2>Certificate templates</h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setEditingTemplate(null);
            setMode('edit');
            setMessage('');
          }}
        >
          New Template
        </button>
      </div>
      <p className="certificate-help-text">
        Build a certificate from headings, fixed text, and fields. Patient salutation, name, dates,
        calculated duration, the medical statement, and doctor details can be placed in any order.
      </p>
      {message && <p className="status-message" role="status">{message}</p>}

      {isLoading ? (
        <div className="empty-state">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">No templates yet. Save one to use it on the next certificate.</div>
      ) : (
        <ul className="history-list">
          {templates.map((template) => (
            <li key={template.id} className="history-item certificate-template-item">
              <span className="history-item-main">
                <strong>{template.name}</strong>
              </span>
              <span className="document-type-badge">{getCategoryLabel(template.category)}</span>
              <span className="history-item-preview">
                {template.blocks.slice(0, 3).map(describeBlock).join(' · ')}
              </span>
              <div className="certificate-header-actions certificate-template-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditingTemplate(template);
                    setMode('edit');
                    setMessage('');
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(template)}
                  disabled={isSaving}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CertificateTemplateManager;
